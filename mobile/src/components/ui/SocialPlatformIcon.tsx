import { InstagramLogoIcon, TiktokLogoIcon } from 'phosphor-react-native';
import { useTheme } from '@/theme/tokens';

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
  const { colors } = useTheme();
  const normalized = platform?.toLowerCase();
  const iconColor = color || colors.text;

  if (normalized === 'tiktok') {
    return <TiktokLogoIcon size={size} color={iconColor} weight={weight} />;
  }

  // Default to Instagram as primary supported social source
  return <InstagramLogoIcon size={size} color={iconColor} weight={weight} />;
}
