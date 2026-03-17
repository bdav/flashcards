import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';

const toastBg = 'oklch(0.35 0.11 225 / 0.85)';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': toastBg,
          '--normal-text': 'white',
          '--normal-border': 'oklch(1 0 0 / 0.2)',
          '--success-bg': toastBg,
          '--success-text': 'oklch(0.8 0.2 155)',
          '--success-border': 'oklch(0.8 0.2 155 / 0.3)',
          '--error-bg': toastBg,
          '--error-text': 'oklch(0.8 0.2 25)',
          '--error-border': 'oklch(0.8 0.2 25 / 0.3)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast backdrop-blur-sm',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
