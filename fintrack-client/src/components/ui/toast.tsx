import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToastStore, type ToastType } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-income" />,
  error: <XCircle className="h-5 w-5 text-destructive" />,
  info: <Info className="h-5 w-5 text-primary" />,
};

const styles: Record<ToastType, string> = {
  success: 'border-income/50 bg-income/10',
  error: 'border-destructive/50 bg-destructive/10',
  info: 'border-primary/50 bg-primary/10',
};

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full pointer-events-auto',
            styles[toast.type]
          )}
        >
          {icons[toast.type]}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
