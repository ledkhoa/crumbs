import { InstagramLogoIcon, TiktokLogoIcon } from 'phosphor-react-native';

export interface SocialPlatformIconProps {
  platform?: string | null;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

export function SocialPlatformIcon({
  platform,
  size = 16,
  color,
  weight = 'fill',
}: SocialPlatformIconProps) {
  const normalized = platform?.toLowerCase();

  if (normalized === 'tiktok') {
    return (
      <TiktokLogoIcon size={size} color={color || '#000000'} weight={weight} />
    );
  }

  // Default to Instagram as primary supported social source
  return (
    <InstagramLogoIcon size={size} color={color || '#E1306C'} weight={weight} />
  );
}
