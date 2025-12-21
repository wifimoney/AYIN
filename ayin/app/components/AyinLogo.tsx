import Image from 'next/image';

export function AyinLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/assets/76d7808ee253be8937e473fa03b6ef526f56be71.png"
      alt="AYIN Logo"
      width={size}
      height={size}
      className="rounded-md"
      priority
    />
  );
}
