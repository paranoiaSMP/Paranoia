"use client";

import React from "react";
import { Check } from "lucide-react";

interface PricingPlan {
  name: string;
  price: string;
  priceSuffix?: string;
  isFeatured?: boolean;
  buttonText: string;
  features: string[];
  extraFeaturesTitle?: string;
  extraFeatures?: string[];
}

export function PricingCards({ plans }: { plans: PricingPlan[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto px-4 my-12">
      {plans.map((plan, idx) => (
        <div
          key={idx}
          className={`relative flex flex-col p-6 rounded-3xl bg-[var(--color-bg-elevated)] border-2 transition-transform duration-300 hover:-translate-y-2 ${
            plan.isFeatured
              ? "border-[var(--color-accent-purple-dark)] shadow-[8px_8px_0px_0px_var(--color-accent-purple-dark)] z-10 scale-100 md:scale-105"
              : "border-[var(--color-border-color)] shadow-[6px_6px_0px_0px_var(--color-border-color)]"
          }`}
        >
          {plan.isFeatured && (
            <div className="absolute -top-4 right-6 bg-[var(--color-bg-primary)] border-2 border-[var(--color-accent-purple-dark)] text-[var(--color-text-primary)] font-bold px-3 py-1 text-xs rounded-full shadow-[2px_2px_0px_0px_var(--color-accent-purple-dark)]">
              Recommandé
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              {plan.name}
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-[var(--color-text-primary)]">
                {plan.price}
              </span>
              {plan.priceSuffix && (
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  {plan.priceSuffix}
                </span>
              )}
            </div>
          </div>

          <button
            className={`w-full py-3 px-4 rounded-xl font-bold text-center border-2 transition-all active:translate-y-1 active:translate-x-1 active:shadow-none ${
              plan.isFeatured
                ? "bg-fuchsia-500 border-fuchsia-700 text-white shadow-[4px_4px_0px_0px_#a21caf] hover:bg-fuchsia-400"
                : "bg-[var(--color-bg-secondary)] border-[var(--color-border-color)] text-[var(--color-text-primary)] shadow-[4px_4px_0px_0px_var(--color-border-color)] hover:bg-[var(--color-bg-primary)]"
            }`}
          >
            {plan.buttonText}
          </button>

          <div className="mt-8 flex-1">
            <ul className="flex flex-col gap-4">
              {plan.features.map((feature, fIdx) => (
                <li key={fIdx} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-color)] flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-fuchsia-400" />
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {plan.extraFeatures && plan.extraFeatures.length > 0 && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--color-border-color)]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-[var(--color-bg-elevated)] px-2 text-[var(--color-text-secondary)] text-lg">
                      +
                    </span>
                  </div>
                </div>

                <ul className="flex flex-col gap-4">
                  {plan.extraFeaturesTitle && (
                    <li className="text-sm font-bold text-[var(--color-text-primary)]">
                      {plan.extraFeaturesTitle}
                    </li>
                  )}
                  {plan.extraFeatures.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/50 flex items-center justify-center mt-0.5">
                        <Check className="w-3.5 h-3.5 text-fuchsia-500" />
                      </div>
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
