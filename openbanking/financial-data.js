// Open Banking Financial Data Module
const { v4: uuidv4 } = require('uuid');

// Mock financial data for demonstration
class FinancialDataService {
  
  constructor() {
    this.initializeMockData();
  }

  initializeMockData() {
    // Mock user accounts
    this.accounts = new Map([
      ['user_001', [
        {
          accountId: 'acc_001_001',
          accountType: 'current',
          accountSubType: 'current_account',
          currency: 'INR',
          accountNumber: '****1234',
          sortCode: '123456',
          accountName: 'Primary Current Account',
          balance: {
            amount: 45000.75,
            currency: 'INR'
          },
          availableBalance: {
            amount: 43500.75,
            currency: 'INR'
          },
          openingDate: '2020-01-15',
          status: 'active'
        },
        {
          accountId: 'acc_001_002', 
          accountType: 'savings',
          accountSubType: 'savings_account',
          currency: 'INR',
          accountNumber: '****5678',
          sortCode: '123456',
          accountName: 'Savings Account',
          balance: {
            amount: 125000.00,
            currency: 'INR'
          },
          availableBalance: {
            amount: 125000.00,
            currency: 'INR'
          },
          openingDate: '2019-06-10',
          status: 'active'
        }
      ]],
      ['user_002', [
        {
          accountId: 'acc_002_001',
          accountType: 'current',
          accountSubType: 'current_account', 
          currency: 'INR',
          accountNumber: '****9876',
          sortCode: '654321',
          accountName: 'Business Current Account',
          balance: {
            amount: 75000.50,
            currency: 'INR'
          },
          availableBalance: {
            amount: 70000.50,
            currency: 'INR'
          },
          openingDate: '2021-03-01',
          status: 'active'
        }
      ]]
    ]);

    // Mock transactions
    this.transactions = new Map();
    this.generateMockTransactions();
  }

  generateMockTransactions() {
    const sampleTransactions = [
      {
        type: 'credit',
        amount: 5000.00,
        description: 'Salary Credit',
        reference: 'SAL/2024/001'
      },
      {
        type: 'debit', 
        amount: 1500.25,
        description: 'ATM Withdrawal',
        reference: 'ATM/2024/001'
      },
      {
        type: 'debit',
        amount: 2500.00,
        description: 'Online Transfer to HDFC',
        reference: 'TXN/2024/001'
      },
      {
        type: 'credit',
        amount: 750.00,
        description: 'Interest Credit',
        reference: 'INT/2024/001'
      }
    ];

    for (const [userId, accounts] of this.accounts.entries()) {
      for (const account of accounts) {
        const accountTransactions = [];
        
        for (let i = 0; i < 10; i++) {
          const baseTransaction = sampleTransactions[i % sampleTransactions.length];
          const transaction = {
            transactionId: uuidv4(),
            accountId: account.accountId,
            amount: {
              amount: baseTransaction.amount + (Math.random() * 1000),
              currency: 'INR'
            },
            creditDebitIndicator: baseTransaction.type.toUpperCase(),
            status: 'completed',
            bookingDateTime: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
            valueDateTime: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
            transactionInformation: baseTransaction.description,
            transactionReference: `${baseTransaction.reference}_${i}`,
            merchantName: baseTransaction.type === 'debit' ? 'Various Merchants' : null,
            transactionCode: {
              code: baseTransaction.type === 'credit' ? 'CR' : 'DR',
              subCode: baseTransaction.type === 'credit' ? '001' : '002'
            }
          };
          
          accountTransactions.push(transaction);
        }
        
        this.transactions.set(account.accountId, accountTransactions);
      }
    }
  }

  // Get all accounts for a user
  getAccounts(userId) {
    const accounts = this.accounts.get(userId);
    
    if (!accounts) {
      return { success: false, error: 'No accounts found for user' };
    }

    return {
      success: true,
      data: {
        accounts: accounts.map(account => ({
          ...account,
          links: {
            self: `/openbanking/v1/accounts/${account.accountId}`,
            transactions: `/openbanking/v1/accounts/${account.accountId}/transactions`,
            balances: `/openbanking/v1/accounts/${account.accountId}/balances`
          }
        }))
      }
    };
  }

  // Get specific account details
  getAccount(userId, accountId) {
    const userAccounts = this.accounts.get(userId);
    
    if (!userAccounts) {
      return { success: false, error: 'User not found' };
    }

    const account = userAccounts.find(acc => acc.accountId === accountId);
    
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    return {
      success: true,
      data: {
        account: {
          ...account,
          links: {
            self: `/openbanking/v1/accounts/${account.accountId}`,
            transactions: `/openbanking/v1/accounts/${account.accountId}/transactions`,
            balances: `/openbanking/v1/accounts/${account.accountId}/balances`
          }
        }
      }
    };
  }

  // Get account balances
  getBalances(userId, accountId) {
    const accountResult = this.getAccount(userId, accountId);
    
    if (!accountResult.success) {
      return accountResult;
    }

    const account = accountResult.data.account;

    return {
      success: true,
      data: {
        balances: [
          {
            accountId: account.accountId,
            type: 'current',
            amount: account.balance,
            dateTime: new Date().toISOString()
          },
          {
            accountId: account.accountId,
            type: 'available',
            amount: account.availableBalance,
            dateTime: new Date().toISOString()
          }
        ]
      }
    };
  }

  // Get account transactions
  getTransactions(userId, accountId, fromDate = null, toDate = null, limit = 50) {
    const accountResult = this.getAccount(userId, accountId);
    
    if (!accountResult.success) {
      return accountResult;
    }

    let transactions = this.transactions.get(accountId) || [];

    // Apply date filters
    if (fromDate) {
      transactions = transactions.filter(txn => 
        new Date(txn.bookingDateTime) >= new Date(fromDate)
      );
    }

    if (toDate) {
      transactions = transactions.filter(txn => 
        new Date(txn.bookingDateTime) <= new Date(toDate)
      );
    }

    // Apply limit
    transactions = transactions.slice(0, limit);

    return {
      success: true,
      data: {
        transactions,
        links: {
          self: `/openbanking/v1/accounts/${accountId}/transactions`,
          account: `/openbanking/v1/accounts/${accountId}`
        },
        meta: {
          totalRecords: transactions.length,
          requestDateTime: new Date().toISOString()
        }
      }
    };
  }

  // Check funds availability (for payment initiation)
  checkFundsAvailability(userId, accountId, amount, currency = 'INR') {
    const balanceResult = this.getBalances(userId, accountId);
    
    if (!balanceResult.success) {
      return balanceResult;
    }

    const availableBalance = balanceResult.data.balances.find(b => b.type === 'available');
    const requestedAmount = parseFloat(amount);
    const availableAmount = parseFloat(availableBalance.amount.amount);

    return {
      success: true,
      data: {
        fundsAvailable: availableAmount >= requestedAmount,
        availableAmount: availableBalance.amount,
        requestedAmount: {
          amount: requestedAmount,
          currency
        },
        accountId,
        dateTime: new Date().toISOString()
      }
    };
  }

  // Create a payment (simplified for demo)
  createPayment(userId, fromAccountId, paymentData) {
    const fundsCheck = this.checkFundsAvailability(
      userId, 
      fromAccountId, 
      paymentData.amount.amount,
      paymentData.amount.currency
    );

    if (!fundsCheck.success || !fundsCheck.data.fundsAvailable) {
      return { 
        success: false, 
        error: 'Insufficient funds',
        details: fundsCheck.data 
      };
    }

    const paymentId = uuidv4();
    const payment = {
      paymentId,
      fromAccountId,
      amount: paymentData.amount,
      toAccount: paymentData.toAccount,
      reference: paymentData.reference || 'Open Banking Payment',
      status: 'pending',
      createdAt: new Date().toISOString(),
      executionDate: paymentData.executionDate || new Date().toISOString()
    };

    // In a real implementation, this would trigger the actual payment process
    // For demo purposes, we'll mark it as completed after a short delay
    setTimeout(() => {
      payment.status = 'completed';
      payment.completedAt = new Date().toISOString();
    }, 2000);

    return {
      success: true,
      data: {
        payment,
        links: {
          self: `/openbanking/v1/payments/${paymentId}`,
          status: `/openbanking/v1/payments/${paymentId}/status`
        }
      }
    };
  }
}

module.exports = new FinancialDataService();