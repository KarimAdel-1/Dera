import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Send, Search } from 'lucide-react';
import { addContact } from '../../../store/contactsSlice';
import { gsap } from 'gsap';
import { hashpackService } from '../../../../services/hashpackService';
import NotificationToast from '../dera-protocol/components/NotificationToast';

const SidebarSection = () => {
  const dispatch = useDispatch();
  const contacts = useSelector((state) => state.contacts.contacts);
  const wallets = useSelector((state) => state.wallet.wallets);
  const defaultWallet = useSelector((state) => state.wallet.defaultWallet);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const barRef = useRef(null);
  const inputRef = useRef(null);
  const addContactRef = useRef(null);

  const senderWallet = wallets.find(w => w.address === defaultWallet) || wallets[0];

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const toggleAddContact = () => {
    if (!showAddContact) {
      setShowAddContact(true);
      setTimeout(() => {
        gsap.to(addContactRef.current, {
          height: 'auto',
          opacity: 1,
          duration: 0.4,
          ease: 'power3.out',
        });
      }, 0);
    } else {
      gsap.to(addContactRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power3.in',
        onComplete: () => setShowAddContact(false),
      });
    }
  };

  const handleAddContact = () => {
    if (contactName.trim() && contactAddress.trim()) {
      dispatch(
        addContact({ name: contactName, walletAddress: contactAddress })
      );
      setContactName('');
      setContactAddress('');
      toggleAddContact();
    }
  };

  const handleMouseEnter = () => {
    const tl = gsap.timeline();
    tl.to(barRef.current, {
      width: '100%',
      borderRadius: '0 30px 30px 30px',
      justifyContent: 'flex-start',
      paddingLeft: '12px',
      duration: 0.5,
      ease: 'power3.out',
    });
    tl.to(
      inputRef.current,
      { opacity: 1, display: 'block', duration: 0.3 },
      '-=0.2'
    );
  };

  const handleMouseLeave = () => {
    const tl = gsap.timeline();
    tl.to(inputRef.current, {
      opacity: 0,
      duration: 0.2,
      onComplete: () => (inputRef.current.style.display = 'none'),
    });
    tl.to(
      barRef.current,
      {
        width: '52px',
        borderRadius: '50%',
        justifyContent: 'center',
        paddingLeft: '0px',
        duration: 0.5,
        ease: 'power3.inOut',
      },
      '-=0.1'
    );
  };

  const handleSendHbar = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) {
      showNotification('Please enter a valid recipient address and amount', 'warning');
      return;
    }

    if (!wallets || wallets.length === 0) {
      showNotification('No wallet connected', 'error');
      return;
    }

    setIsSending(true);
    try {
      const { TransferTransaction, Hbar, AccountId } = await import('@hashgraph/sdk');
      const { hederaService } = await import('../../../../services/hederaService');
      const { setWalletData } = await import('../../../store/walletSlice');
      
      const senderAccountId = senderWallet.address;
      const transaction = new TransferTransaction()
        .addHbarTransfer(senderAccountId, Hbar.fromString(`-${amount}`))
        .addHbarTransfer(AccountId.fromString(recipient), Hbar.fromString(amount));

      const result = await hashpackService.sendTransaction(senderAccountId, transaction);
      
      showNotification(`Successfully sent ${amount} HBAR!`, 'success');
      setAmount('');
      setRecipient('');
      
      // Refresh transactions after successful send
      setTimeout(async () => {
        const transactions = await hederaService.getAccountTransactions(senderAccountId, 10);
        const balanceData = await hederaService.getAccountBalance(senderAccountId);
        dispatch(setWalletData({
          accountId: senderAccountId,
          data: {
            hbarBalance: balanceData.hbarBalance,
            transactions,
          },
        }));
      }, 2000);
    } catch (error) {
      console.error('Error sending HBAR:', error);
      showNotification(`Failed to send HBAR: ${error.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maxVisibleContacts = 5;
  const visibleContacts = filteredContacts.slice(0, maxVisibleContacts);
  const remainingCount = filteredContacts.length - maxVisibleContacts;

  return (
    <div className="col-span-1 md:col-span-2 xl:col-span-1 xl:row-start-1 xl:col-start-3 xl:row-span-2 h-auto xl:h-[770px]">
      <div className="hidden sm:block bg-[var(--color-bg-card)] rounded-[12px] sm:rounded-[20px] border border-[var(--color-border-primary)] h-full p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal">
            Quick Transfer
          </h3>
          <span
            onClick={toggleAddContact}
            className="text-[var(--color-primary)] text-[12px] sm:text-[13px] font-normal cursor-pointer hover:opacity-80"
          >
            {showAddContact ? '- Close' : '+ Add contract'}
          </span>
        </div>

        <div className="mb-4 sm:mb-6">
          <div
            ref={barRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="relative flex items-center justify-center bg-[var(--color-bg-card)] w-[52px] h-[52px] rounded-full overflow-hidden border border-[var(--color-border-primary)] mb-3"
          >
            <div className="flex-shrink-0 bg-[var(--color-bg-hover)] p-2 rounded-full">
              <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="ml-2 w-full bg-transparent border-none text-[var(--color-text-primary)] text-[13px] focus:outline-none hidden"
              style={{ opacity: 0 }}
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            {visibleContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setRecipient(contact.walletAddress)}
                className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80"
              >
                <div className="w-[48px] h-[48px] bg-[var(--color-primary)] flex items-center justify-center rounded-full">
                  <span className="text-white text-[16px] font-medium">
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-[var(--color-text-muted)] text-[10px] max-w-[48px] truncate">
                  {contact.name}
                </span>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="flex flex-col items-center gap-1">
                <div className="w-[48px] h-[48px] bg-[var(--color-bg-hover)] flex items-center justify-center rounded-full border border-[var(--color-border-primary)]">
                  <span className="text-[var(--color-text-primary)] text-[14px] font-medium">
                    +{remainingCount}
                  </span>
                </div>
                <span className="text-[var(--color-text-muted)] text-[10px] max-w-[48px] truncate">
                  More
                </span>
              </div>
            )}
          </div>
        </div>

        {showAddContact && (
          <div
            ref={addContactRef}
            className="mb-4 overflow-hidden"
            style={{ height: 0, opacity: 0 }}
          >
            <div className="p-4 bg-[var(--color-bg-hover)]/30 rounded-lg space-y-3">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact Name"
                className="w-full px-3 py-2 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] outline-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
              <input
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                placeholder="Wallet Address (0.0.1234567)"
                className="w-full px-3 py-2 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] outline-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              />
              <button
                onClick={handleAddContact}
                className="w-full bg-[var(--color-primary)] text-white rounded-lg px-4 py-2 text-[13px] hover:bg-[var(--color-primary)]/90"
              >
                Save Contact
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 block">
              From (Sender)
            </label>
            <input
              type="text"
              value={senderWallet?.address || 'No wallet connected'}
              disabled
              className="w-full px-3 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-muted)] text-[13px] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 block">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0.0.1234567"
              className="w-full px-3 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] outline-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 block">
              Amount (HBAR)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-3 bg-[var(--color-bg-input)] border border-[var(--color-border-input)] rounded-lg text-[var(--color-text-primary)] text-[13px] outline-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
            />
          </div>

          <button 
            onClick={handleSendHbar}
            disabled={isSending || !recipient || !amount}
            className="inline-flex items-center justify-center gap-2 w-full bg-[var(--color-primary)] text-white rounded-lg px-4 py-3 font-medium text-[13px] sm:text-[14px] hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Sending...' : 'Send HBAR'}
          </button>
        </div>
      </div>
      
      {notification.show && (
        <NotificationToast message={notification.message} type={notification.type} />
      )}
    </div>
  );
};

export default SidebarSection;
