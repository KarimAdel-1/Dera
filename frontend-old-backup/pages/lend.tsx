import Head from 'next/head';
import Layout from '@/components/Layout';
import LendingInterface from '@/components/LendingInterface';

export default function Lend() {
  return (
    <>
      <Head>
        <title>Lend - Dera</title>
        <meta name="description" content="Deposit HBAR and earn yields across three liquidity tiers" />
      </Head>
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-8">Lend HBAR</h1>
          <LendingInterface />
        </div>
      </Layout>
    </>
  );
}
