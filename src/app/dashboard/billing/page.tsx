import { IconCreditCard, IconSparkles } from '@tabler/icons-react';

export default function BillingPage() {
  return (
    <div className='flex min-h-[calc(100vh-4rem)] items-center justify-center p-6'>
      <div className='w-full max-w-2xl space-y-8 text-center'>
        {/* Icon */}
        <div className='flex justify-center'>
          <div className='rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 shadow-2xl ring-1 ring-zinc-700/50'>
            <IconCreditCard
              className='h-16 w-16 text-zinc-400'
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Heading */}
        <div className='space-y-3'>
          <h1 className='text-4xl font-bold tracking-tight text-white'>
            Billing Coming Soon
          </h1>
          <p className='mx-auto max-w-lg text-lg leading-relaxed text-zinc-400'>
            We're designing transparent and flexible pricing plans — and setting
            up secure billing.
          </p>
          <p className='text-base text-zinc-500'>
            You'll be able to manage subscriptions and invoices right here soon!
          </p>
        </div>
      </div>
    </div>
  );
}
