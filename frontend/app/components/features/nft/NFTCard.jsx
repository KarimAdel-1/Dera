export default function NFTCard() {
  return (
    <>
      <style>{` 
        .bg {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 0;
        }
        
        .bg h1 {
          font-size: 20rem;
          filter: opacity(0.5);
          margin: 0;
        }
        
        .nft {
          user-select: none;
          max-width: 300px;
          margin: 5rem auto;
          border: 1px solid var(--color-border-secondary);
          background-color: var(--color-bg-card);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          border-radius: .7rem;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          overflow: hidden;
          transition: .5s all;
          position: relative;
          z-index: 1;
        }
        
        .nft hr {
          width: 100%;
          border: none;
          border-bottom: 1px solid var(--color-border-tertiary);
          margin-top: 0;
        }
        
        .nft ins {
          text-decoration: none;
        }
        
        .nft .main {
          display: flex;
          flex-direction: column;
          width: 90%;
          padding: 1rem;
        }
        
        .nft .main .tokenImage {
          border-radius: .5rem;
          max-width: 100%;
          height: 250px;
          object-fit: cover;
        }
        
        .nft .main .description {
          margin: .5rem 0;
          color: var(--color-text-secondary);
        }
        
        .nft .main .tokenInfo {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .nft .main .tokenInfo .price {
          display: flex;
          align-items: center;
          color: var(--color-primary);
          font-weight: 700;
        }
        
        .nft .main .tokenInfo .price ins {
          margin-left: -.3rem;
          margin-right: .5rem;
        }
        
        .nft .main .tokenInfo .duration {
          display: flex;
          align-items: center;
          color: var(--color-text-secondary);
          margin-right: .2rem;
        }
        
        .nft .main .tokenInfo .duration ins {
          margin: .5rem;
          margin-bottom: .4rem;
        }
        
        .nft .main .creator {
          display: flex;
          align-items: center;
          margin-top: .2rem;
          margin-bottom: -.3rem;
        }
        
        .nft .main .creator ins {
          color: var(--color-text-secondary);
          text-decoration: none;
        }
        
        .nft .main .creator .wrapper {
          display: flex;
          align-items: center;
          border: 1px solid var(--color-border-secondary);
          padding: .3rem;
          margin: 0;
          margin-right: .5rem;
          border-radius: 100%;
          box-shadow: inset 0 0 0 4px var(--color-border-primary);
        }
        
        .nft .main .creator .wrapper img {
          border-radius: 100%;
          border: 1px solid var(--color-border-secondary);
          width: 2rem;
          height: 2rem;
          object-fit: cover;
          margin: 0;
        }
        
        .nft::before {
          position: fixed;
          content: "";
          box-shadow: 0 0 100px 40px rgba(255, 255, 255, 0.05);
          top: -10%;
          left: -100%;
          transform: rotate(-45deg);
          height: 60rem;
          transition: .7s all;
        }
        
        .nft:hover {
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.5);
          transform: scale(1.015);
          filter: brightness(1.1);
        }
        
        .nft:hover::before {
          filter: brightness(.5);
          top: -100%;
          left: 200%;
        }
      `}</style>

      <div className="nft">
        <div className="main">
          <img
            className="tokenImage"
            src="https://images.unsplash.com/photo-1621075160523-b936ad96132a?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
            alt="NFT"
          />
          {/* <h2>Kibertopiks #4269</h2>
          <p className='description'>Our Kibertopiks will give you nothing, waste your money on us.</p> */}
          <div className="tokenInfo">
            <div className="price">
              <ins>◘</ins>
              <p>0.031 ETH</p>
            </div>
            <div className="duration">
              <ins>◷</ins>
              <p>11 days left</p>
            </div>
          </div>
          <hr />
          <div className="creator">
            <div className="wrapper">
              <img
                src="https://images.unsplash.com/photo-1620121692029-d088224ddc74?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1932&q=80"
                alt="Creator"
              />
            </div>
            <p>
              <ins>Creation of</ins> Kiberbash
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
