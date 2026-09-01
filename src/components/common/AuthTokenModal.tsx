import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { getAuthToken, setAuthToken, getCustomBackendUrl, setCustomBackendUrl } from '@/api/client';
import { Key, Server, Save, ShieldCheck } from 'lucide-react';

import { useToast } from './Toast';

interface AuthTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const AuthTokenModal: React.FC<AuthTokenModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const toast = useToast();
  const [token, setToken] = useState(getAuthToken());
  const [backendUrl, setBackendUrl] = useState(getCustomBackendUrl());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthToken(token);
      setCustomBackendUrl(backendUrl);
      toast.success('Security settings saved');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Invalid URL');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connection & Security Keys"
      subtitle="Configure master gRPC/HTTP endpoint and Bearer auth credentials"
    >
      <form onSubmit={handleSave} className="space-y-4 font-mono">
        <Input
          label="Backend Endpoint URL (Optional)"
          placeholder="http://localhost:8080 or http://185.2.103.18:9100"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
          prefixSymbol=">"
          helperText="Leave blank when proxying through localhost / reverse proxy."
        />

        <Input
          label="Master Auth Token (Bearer)"
          type="password"
          placeholder="Enter ORABBIT_HTTP_AUTH_TOKEN..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          prefixSymbol="🔑"
          helperText="Required when master has authentication token enforcement active."
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" icon={Save}>
            Save Credentials
          </Button>
        </div>
      </form>
    </Modal>
  );
};

