import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { Table } from 'antd'
import { reaction } from 'mobx'
import { observer, inject } from 'mobx-react'

import { FinContext } from '../FinContext'
import { Section } from '../Section'

import API from 'lib/api'

import styles from './styles.module.css'

const columns = [
  {
    title: 'ID',
    dataIndex: 'id'
  },
  {
    title: 'Date',
    dataIndex: 'created'
  },
  {
    title: 'Amount',
    dataIndex: 'amount_due'
  },
  {
    title: 'Status',
    dataIndex: 'status'
  },
  {
    title: 'PDF',
    dataIndex: 'invoice_pdf',
    render: (link) => (
      <a href={link} title='Invoice PDF'>Download</a>
    )
  }
]

@inject('auth')
@observer
export class InvoicingSection extends Component {
  static propTypes = {
    auth: PropTypes.object.isRequired
  }

  state = {
    data: [],
    pagination: {
      pageSize: 10
    },
    loading: false
  }

  componentDidMount() {
    this._fetch()
  }

  componentWillUnmount() {
    this._disposer()
  }

  componentDidUpdate() {
    if (this._reset) {
      this._reset = false
      this._fetch()
    }
  }

  _disposer = reaction(
    () => this.props.auth.consumer,
    () => this._reset = true
  )

  _reset = false

  render() {
    const {
      auth,
      ...rest
    } = this.props

    const {
      data,
      pagination,
      loading
    } = this.state

    return (
      <FinContext.Consumer>
        {project => (
          <Section
            title='Invoicing'
            {...rest}
          >
            <div className={styles.body}>
              <Table
                columns={columns}
                rowKey={record => record.id}
                dataSource={data}
                pagination={pagination}
                loading={loading}
                onChange={this._handleTableChange}
              />
            </div>
          </Section>
        )}
      </FinContext.Consumer>
    )
  }

  _handleTableChange = (pagination, filters, sorter) => {
    const pager = { ...this.state.pagination }
    pager.current = pagination.current
    this.setState({ pagination: pager })

    this._fetch({
      results: pagination.pageSize,
      page: pagination.current,
      sortField: sorter.field,
      sortOrder: sorter.order,
      ...filters
    })
  }

  _fetch = (params = {}) => {
    const {
      auth
    } = this.props

    console.log('_fetch', auth)
    if (!auth.consumer) {
      return
    }

    let {
      data,
      pagination
    } = this.state

    console.log('params', params)

    if (!params.page || params.page * pagination.pageSize >= data.length) {
      this.setState({ loading: true })

      const opts = { limit: 10 }

      if (data.length) {
        opts.ending_before = data[data.length - 1].id
      }

      API.listBillingInvoicesForConsumer(auth.consumer, opts)
        .then((invoices) => {
          const pagination = { ...this.state.pagination }

          if (!invoices.length) {
            pagination.total = data.length
          } else {
            data = data.concat(invoices)
            pagination.total = data.length
          }

          this.setState({
            loading: false,
            data,
            pagination
          })
        })
    }
  }
}
