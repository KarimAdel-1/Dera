import Head from 'next/head';
import Layout from '@/components/Layout';
import BorrowingInterface from '@/components/BorrowingInterface';

export default function Borrow() {
  return (
    <>
      <Head>
        <title>Borrow - Dera</title>
        <meta name="description" content="Borrow against HBAR collateral with dynamic credit scoring" />
      </Head>
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-8">Borrow with HBAR Collateral</h1>
          <BorrowingInterface />
        </div>
      </Layout>
    </>
  );
}
