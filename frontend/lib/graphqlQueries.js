import { gql } from '@apollo/client';

export const ALL_METRICS_QUERY = gql`
  query AllMetrics {
    newAccountsHour: ecosystem_metric(
      order_by: {end_date: desc_nulls_last}
      limit: 1
      where: {name: {_eq: "new_accounts"}, period: {_eq: "hour"}}
    ) {
      total
      end_date
    }

    activeAccountsHour: ecosystem_metric(
      order_by: {end_date: desc_nulls_last}
      limit: 1
      where: {name: {_eq: "active_accounts"}, period: {_eq: "hour"}}
    ) {
      total
      end_date
    }

    networkTPS: ecosystem_metric(
      where: {name: {_eq: "network_tps"}}
      order_by: {end_date: desc_nulls_last}
      limit: 1
    ) {
      total
      end_date
    }

    avgTTC: ecosystem_metric(
      where: {name: {_eq: "avg_time_to_consensus"}, period: {_eq: "hour"}}
      order_by: {end_date: desc_nulls_last}
      limit: 1
    ) {
      total
      end_date
    }
  }
`;

export const NETWORK_FEES_QUERY = gql`
  query NetworkFees24h($timestamp24hAgo: bigint!, $currentTimestamp: bigint!) {
    transaction_aggregate(
      where: {
        consensus_timestamp: {
          _gte: $timestamp24hAgo,
          _lt: $currentTimestamp
        }
      }
    ) {
      aggregate {
        sum { charged_tx_fee }
        min { charged_tx_fee }
        max { charged_tx_fee }
      }
    }
  }
`;

export const TRANSACTION_TYPES_QUERY = gql`
  query CompareTotalTransactionTypes($period: String!) {
    all: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "total_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    crypto: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "total_crypto_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    hcs: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "total_hcs_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    hfs: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "total_hfs_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    hscs: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "total_hscs_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    hts: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "total_hts_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    other: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "total_other_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }
  }
`;

export const NEW_TRANSACTION_TYPES_QUERY = gql`
  query CompareNewTransactionTypes($period: String!) {
    new_transactions: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "new_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    new_crypto_transactions: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "new_crypto_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    new_hcs_transactions: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "new_hcs_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    new_hfs_transactions: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "new_hfs_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    new_hscs_transactions: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "new_hscs_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    new_hts_transactions: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "new_hts_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }

    new_other_transactions: ecosystem_metric(
      order_by: { end_date: desc_nulls_last }
      limit: 1
      where: { name: { _eq: "new_other_transactions" }, period: { _eq: $period } }
    ) {
      total
      end_date
    }
  }
`;
