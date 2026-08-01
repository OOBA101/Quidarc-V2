export class ContentService {
  listNews() {
    return {
      items: [
        {
          id: 'news-1',
          title: 'Arc testnet expands DeFi coverage',
          summary: 'New lending and swap venues are live for testing on Arc Testnet.',
        },
      ],
    };
  }

  listDApps() {
    return {
      items: [
        {
          id: 'dapp-1',
          name: 'Uniswap',
          category: 'Exchange',
          summary: 'Swap and route liquidity on Arc testnet.',
        },
        {
          id: 'dapp-2',
          name: 'Euler',
          category: 'Lending',
          summary: 'Borrow and lend assets with a simple interface.',
        },
      ],
    };
  }
}
