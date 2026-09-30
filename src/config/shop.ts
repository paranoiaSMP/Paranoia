export interface CoinPackage {
  id: string;
  title: string;
  amount: number;
  baseAmount: number;
  bonusAmount: number;
  price: string;
  popular: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: "pkg_100",
    title: "Pack Débutant",
    amount: 100,
    baseAmount: 100,
    bonusAmount: 0,
    price: "2,99€",
    popular: false,
  },
  {
    id: "pkg_500",
    title: "Pack Épique",
    amount: 500,
    baseAmount: 450,
    bonusAmount: 50,
    price: "5,99€",
    popular: true,
  },
  {
    id: "pkg_1000",
    title: "Pack Légendaire",
    amount: 1000,
    baseAmount: 850,
    bonusAmount: 150,
    price: "9,99€",
    popular: false,
  },
];
