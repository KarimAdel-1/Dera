import React, { memo } from 'react';

/**
 * Card skin selector component
 * Allows users to choose a card design for their wallet
 */
const CardSkinSelector = memo(({ selectedSkin, onSkinChange, cardSkins }) => {
  return (
    <div className="mb-6">
      <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-4">
        Choose Card Design
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cardSkins.map((skin) => (
          <label key={skin} className="cursor-pointer">
            <input
              type="radio"
              name="cardSkin"
              value={skin}
              checked={selectedSkin === skin}
              onChange={() => onSkinChange(skin)}
              className="sr-only"
            />
            <div
              className={`rounded-lg overflow-hidden transition-all ${
                selectedSkin === skin
                  ? 'ring-2 ring-[var(--color-primary)] scale-105'
                  : 'hover:scale-102'
              }`}
            >
              <div
                className="w-full h-24 bg-cover bg-center"
                style={{
                  backgroundImage: `url(/assets/cards/${skin})`,
                }}
              ></div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
});

CardSkinSelector.displayName = 'CardSkinSelector';

export default CardSkinSelector;
