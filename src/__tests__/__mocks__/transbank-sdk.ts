/**
 * Mock for Transbank SDK
 * Used during testing to avoid issues with the actual SDK
 */

const mockOneclick = {
  configureForIntegration: jest.fn(),
  configureForProduction: jest.fn(),
  getDefaultOptions: jest.fn(() => ({})),
  MallInscription: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue({
      token: 'mock_token_123',
      url_webpay: 'https://mock-transbank.com/webpay'
    }),
    finish: jest.fn().mockResolvedValue({
      tbk_user: 'mock_tbk_user',
      card: {
        card_number: '****1234'
      }
    })
  })),
  MallTransaction: jest.fn().mockImplementation(() => ({
    authorize: jest.fn().mockResolvedValue({
      response_code: 0,
      buy_order: 'mock_order'
    }),
    refund: jest.fn().mockResolvedValue({
      response_code: 0
    }),
    status: jest.fn().mockResolvedValue({
      response_code: 0
    })
  }))
};

const mockIntegrationCommerceCodes = {
  ONECLICK_MALL: '597055555541'
};

const mockIntegrationApiKeys = {
  WEBPAY: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C'
};

const mockTransactionDetail = jest.fn().mockImplementation((amount, commerceCode, buyOrder, installments) => ({
  amount,
  commerceCode,
  buyOrder,
  installmentsNumber: installments,
  toPlainObject: () => ({
    amount,
    commerce_code: commerceCode,
    buy_order: buyOrder,
    installments_number: installments
  })
}));

// Mock the entire transbank-sdk module
jest.mock('transbank-sdk', () => ({
  Oneclick: mockOneclick,
  IntegrationCommerceCodes: mockIntegrationCommerceCodes,
  IntegrationApiKeys: mockIntegrationApiKeys,
  TransactionDetail: mockTransactionDetail
}));

export {
  mockOneclick,
  mockIntegrationCommerceCodes,
  mockIntegrationApiKeys,
  mockTransactionDetail
};