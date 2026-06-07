'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { useCart } from '@/bm/lib/cart';
import type { Product } from '@/bm/types';
import { formatPrice } from '@/bm/lib/format';

interface SupplementPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplement: Product | null;
  onSelect: (attachedToProductId: string) => void;
  onSkip: () => void;
}

export default function SupplementPicker({
  open,
  onOpenChange,
  supplement,
  onSelect,
  onSkip,
}: SupplementPickerProps) {
  const { items } = useCart();
  const [selected, setSelected] = useState<string | null>(null);

  // Get burgers in cart (items without attachedToProductId)
  const burgers = items.filter((item) => !item.attachedToProductId);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
    setSelected(null);
    onOpenChange(false);
  };

  const handleSkip = () => {
    setSelected(null);
    onOpenChange(false);
    onSkip();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelected(null);
    }
    onOpenChange(newOpen);
  };

  if (!supplement || burgers.length === 0) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-bold text-stone-800">
            Pour quel burger ?
          </DrawerTitle>
          <DrawerDescription className="text-sm text-stone-500">
            {supplement.name} — {formatPrice(supplement.price)}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2">
          <div className="space-y-2">
            {burgers.map((burger) => (
              <button
                key={burger.product.id}
                onClick={() => setSelected(burger.product.id)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                  selected === burger.product.id
                    ? 'border-bm-primary bg-bm-primary-50'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected === burger.product.id
                      ? 'border-bm-primary bg-bm-primary'
                      : 'border-stone-300'
                  }`}
                >
                  {selected === burger.product.id && (
                    <svg className="h-3.5 w-3.5 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-800 truncate">
                      {burger.product.name}
                    </span>
                    {burger.quantity > 1 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-bm-primary/10 px-2 py-0.5 text-xs font-bold text-bm-primary">
                        ×{burger.quantity}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-stone-500 shrink-0">
                  {formatPrice(burger.product.price)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <DrawerFooter className="pt-2">
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="btn-bm btn-bm-primary btn-bm-lg block w-full text-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmer
          </button>
          <button
            onClick={handleSkip}
            className="btn-bm btn-bm-ghost block w-full text-center"
          >
            Ajouter sans préciser
          </button>
          <DrawerClose asChild>
            <button className="btn-bm btn-bm-ghost block w-full text-center text-stone-400">
              Annuler
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
