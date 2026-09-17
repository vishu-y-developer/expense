import type { CSSProperties } from 'react';
import type { IconProps as PhosphorIconProps, Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ForkKnife } from '@phosphor-icons/react/dist/csr/ForkKnife';
import { Airplane } from '@phosphor-icons/react/dist/csr/Airplane';
import { ShoppingBag } from '@phosphor-icons/react/dist/csr/ShoppingBag';
import { Receipt } from '@phosphor-icons/react/dist/csr/Receipt';
import { GraduationCap } from '@phosphor-icons/react/dist/csr/GraduationCap';
import { Heartbeat } from '@phosphor-icons/react/dist/csr/Heartbeat';
import { FilmSlate } from '@phosphor-icons/react/dist/csr/FilmSlate';
import { Repeat } from '@phosphor-icons/react/dist/csr/Repeat';
import { User } from '@phosphor-icons/react/dist/csr/User';
import { DotsThreeCircle } from '@phosphor-icons/react/dist/csr/DotsThreeCircle';
import { Briefcase } from '@phosphor-icons/react/dist/csr/Briefcase';
import { Laptop } from '@phosphor-icons/react/dist/csr/Laptop';
import { Buildings } from '@phosphor-icons/react/dist/csr/Buildings';
import { Wallet } from '@phosphor-icons/react/dist/csr/Wallet';
import { Gift } from '@phosphor-icons/react/dist/csr/Gift';
import { ArrowUUpLeft } from '@phosphor-icons/react/dist/csr/ArrowUUpLeft';
import { QrCode } from '@phosphor-icons/react/dist/csr/QrCode';
import { Money } from '@phosphor-icons/react/dist/csr/Money';
import { CreditCard } from '@phosphor-icons/react/dist/csr/CreditCard';
import { Bank } from '@phosphor-icons/react/dist/csr/Bank';
import { House } from '@phosphor-icons/react/dist/csr/House';
import { ClockCounterClockwise } from '@phosphor-icons/react/dist/csr/ClockCounterClockwise';
import { ChartBar } from '@phosphor-icons/react/dist/csr/ChartBar';
import { GearSix } from '@phosphor-icons/react/dist/csr/GearSix';
import { Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { CaretLeft } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRight } from '@phosphor-icons/react/dist/csr/CaretRight';
import { CaretDown } from '@phosphor-icons/react/dist/csr/CaretDown';
import { ArrowUp } from '@phosphor-icons/react/dist/csr/ArrowUp';
import { ArrowDown } from '@phosphor-icons/react/dist/csr/ArrowDown';
import { Check } from '@phosphor-icons/react/dist/csr/Check';
import { Trash } from '@phosphor-icons/react/dist/csr/Trash';
import { DownloadSimple } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { UploadSimple } from '@phosphor-icons/react/dist/csr/UploadSimple';
import { Moon } from '@phosphor-icons/react/dist/csr/Moon';
import { Sun } from '@phosphor-icons/react/dist/csr/Sun';
import { Monitor } from '@phosphor-icons/react/dist/csr/Monitor';
import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { Funnel } from '@phosphor-icons/react/dist/csr/Funnel';
import { TrendUp } from '@phosphor-icons/react/dist/csr/TrendUp';
import { ArrowsClockwise } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';

export type IconName =
  | 'food'
  | 'travel'
  | 'shopping'
  | 'bills'
  | 'education'
  | 'health'
  | 'entertainment'
  | 'subscriptions'
  | 'personal'
  | 'other'
  | 'salary'
  | 'freelancing'
  | 'business'
  | 'pocketMoney'
  | 'gift'
  | 'refund'
  | 'upi'
  | 'cash'
  | 'debitCard'
  | 'creditCard'
  | 'bankTransfer'
  | 'home'
  | 'history'
  | 'analytics'
  | 'settings'
  | 'plus'
  | 'close'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'arrowUp'
  | 'arrowDown'
  | 'check'
  | 'trash'
  | 'download'
  | 'upload'
  | 'moon'
  | 'sun'
  | 'system'
  | 'shield'
  | 'search'
  | 'filter'
  | 'wallet'
  | 'trendUp'
  | 'refresh';

const COMPONENTS: Record<IconName, PhosphorIcon> = {
  food: ForkKnife,
  travel: Airplane,
  shopping: ShoppingBag,
  bills: Receipt,
  education: GraduationCap,
  health: Heartbeat,
  entertainment: FilmSlate,
  subscriptions: Repeat,
  personal: User,
  other: DotsThreeCircle,
  salary: Briefcase,
  freelancing: Laptop,
  business: Buildings,
  pocketMoney: Wallet,
  gift: Gift,
  refund: ArrowUUpLeft,
  upi: QrCode,
  cash: Money,
  debitCard: CreditCard,
  creditCard: CreditCard,
  bankTransfer: Bank,
  home: House,
  history: ClockCounterClockwise,
  analytics: ChartBar,
  settings: GearSix,
  plus: Plus,
  close: X,
  chevronLeft: CaretLeft,
  chevronRight: CaretRight,
  chevronDown: CaretDown,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  check: Check,
  trash: Trash,
  download: DownloadSimple,
  upload: UploadSimple,
  moon: Moon,
  sun: Sun,
  system: Monitor,
  shield: ShieldCheck,
  search: MagnifyingGlass,
  filter: Funnel,
  wallet: Wallet,
  trendUp: TrendUp,
  refresh: ArrowsClockwise,
};

export function Icon({
  name,
  size = 20,
  weight = 'light',
  className,
  style,
}: {
  name: IconName;
  size?: number;
  weight?: PhosphorIconProps['weight'];
  className?: string;
  style?: CSSProperties;
}) {
  const Component = COMPONENTS[name];
  return (
    <Component
      size={size}
      weight={weight}
      color="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    />
  );
}

const EXPENSE_CATEGORY_ICON: Record<string, IconName> = {
  Food: 'food',
  Travel: 'travel',
  Shopping: 'shopping',
  Bills: 'bills',
  Education: 'education',
  Health: 'health',
  Entertainment: 'entertainment',
  Subscriptions: 'subscriptions',
  Personal: 'personal',
  Other: 'other',
};

const EARNING_CATEGORY_ICON: Record<string, IconName> = {
  Salary: 'salary',
  Freelancing: 'freelancing',
  Business: 'business',
  'Pocket Money': 'pocketMoney',
  Gift: 'gift',
  Refund: 'refund',
  Other: 'other',
};

const PAYMENT_ICON: Record<string, IconName> = {
  UPI: 'upi',
  Cash: 'cash',
  'Debit Card': 'debitCard',
  'Credit Card': 'creditCard',
  'Bank Transfer': 'bankTransfer',
  Other: 'other',
};

export function categoryIcon(type: 'earning' | 'expense', category: string): IconName {
  const map = type === 'earning' ? EARNING_CATEGORY_ICON : EXPENSE_CATEGORY_ICON;
  return map[category] ?? 'other';
}

export function paymentIcon(method: string): IconName {
  return PAYMENT_ICON[method] ?? 'other';
}
