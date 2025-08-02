import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, XCircle } from "lucide-react";

interface NotificationToastProps {
  type: 'approval' | 'rejection';
  message: string;
  onClose: () => void;
}

export const NotificationToast = ({ type, message, onClose }: NotificationToastProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <Card className={`bg-card/95 backdrop-blur-sm border shadow-lg min-w-[300px] max-w-[400px] ${
        type === 'approval' 
          ? 'border-green-500/50 bg-green-50/10' 
          : 'border-red-500/50 bg-red-50/10'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${
              type === 'approval' ? 'text-green-500' : 'text-red-500'
            }`}>
              {type === 'approval' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
            </div>
            
            <div className="flex-1">
              <h4 className={`font-semibold text-sm ${
                type === 'approval' ? 'text-green-400' : 'text-red-400'
              }`}>
                {type === 'approval' ? '✅ Solicitação Aprovada' : '❌ Solicitação Negada'}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {message}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};