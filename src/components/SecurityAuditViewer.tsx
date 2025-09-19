import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Shield, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityEvent {
  timestamp: string;
  action: string;
  userId?: string;
  resource?: string;
  success: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
}

const SecurityAuditViewer: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    loadSecurityEvents();
  }, []);

  const loadSecurityEvents = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('security_events') || '[]');
      setEvents(stored.reverse()); // Show most recent first
    } catch (error) {
      console.error('Failed to load security events:', error);
    }
  };

  const clearEvents = () => {
    localStorage.removeItem('security_events');
    setEvents([]);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'outline';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (!user) {
    return null; // Only show to authenticated users
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Journal d'audit de sécurité
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearEvents}
          disabled={events.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Effacer
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun événement de sécurité enregistré
          </p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {events.map((event, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  event.success ? 'bg-background' : 'bg-destructive/5 border-destructive/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(event.severity)}
                    <span className="font-medium">{event.action}</span>
                    <Badge variant={getSeverityColor(event.severity) as any}>
                      {event.severity}
                    </Badge>
                    <Badge variant={event.success ? 'outline' : 'destructive'}>
                      {event.success ? 'Succès' : 'Échec'}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  {event.resource && (
                    <div>Ressource: {event.resource}</div>
                  )}
                  {event.details && (
                    <div>Détails: {event.details}</div>
                  )}
                  {event.userId && (
                    <div className="text-xs">
                      Utilisateur: {event.userId.substring(0, 8)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityAuditViewer;