export class ContentService {
  listNews() {
    return {
      items: [
        {
          id: 'news-1',
          title: 'Arc Testnet Ecosystem Partner Updates',
          summary: 'Ecosystem partners and protocol integrations preparing for upcoming Arc deployments.',
        },
      ],
    };
  }

  listDApps() {
    return {
      items: [
        {
          id: 'dapp-1',
          name: 'Uniswap (Ecosystem Partner)',
          category: 'Exchange',
          summary: 'Planned DEX liquidity venue integration for Arc.',
        },
        {
          id: 'dapp-2',
          name: 'Euler (Ecosystem Partner)',
          category: 'Lending',
          summary: 'Planned lending and borrowing protocol venue for Arc.',
        },
      ],
    };
  }
}
