import Head from 'next/head';
import Layout from '@/components/Layout';
import Hero from '@/components/Hero';
import PoolStats from '@/components/PoolStats';
import Features from '@/components/Features';

export default function Home() {
  return (
    <>
      <Head>
        <title>Dera - Decentralized Lending on Hedera</title>
        <meta name="description" content="Multi-tier liquidity pools with HBAR staking rewards" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <Hero />
        <PoolStats />
        <Features />
      </Layout>
    </>
  );
}
