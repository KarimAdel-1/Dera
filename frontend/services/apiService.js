const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Lending APIs
  async deposit(data) {
    return this.request('/api/lend/deposit', {
      method: 'POST',
      body: data
    })
  }

  async withdraw(data) {
    return this.request('/api/lend/withdraw', {
      method: 'POST',
      body: data
    })
  }

  async requestWithdrawal(data) {
    return this.request('/api/lend/request-withdrawal', {
      method: 'POST',
      body: data
    })
  }

  async getDeposits(userId) {
    return this.request(`/api/lend/deposits/${userId}`)
  }

  async getWithdrawalRequests(userId) {
    return this.request(`/api/lend/withdrawal-requests/${userId}`)
  }

  async getPoolStats() {
    return this.request('/api/pools/stats')
  }

  // Borrowing APIs
  async createLoan(data) {
    return this.request('/api/borrow/create', {
      method: 'POST',
      body: data
    })
  }

  async repayLoan(data) {
    return this.request('/api/borrow/repay', {
      method: 'POST',
      body: data
    })
  }

  async addCollateral(data) {
    return this.request('/api/borrow/add-collateral', {
      method: 'POST',
      body: data
    })
  }

  async getLoans(userId) {
    return this.request(`/api/borrow/loans/${userId}`)
  }

  async getUser(userId) {
    return this.request(`/api/users/${userId}`)
  }

  async updateUser(userId, data) {
    return this.request(`/api/users/${userId}`, {
      method: 'PUT',
      body: data
    })
  }

  // Analytics APIs
  async getPortfolio(userId) {
    return this.request(`/api/analytics/portfolio/${userId}`)
  }

  async getEarningsHistory(userId) {
    return this.request(`/api/analytics/earnings/${userId}`)
  }
}

export const apiService = new ApiService()