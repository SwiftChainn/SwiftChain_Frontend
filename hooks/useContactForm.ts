import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  contactService,
  type ContactPayload,
  type ContactResponse,
  type SupportCategory,
} from '@/services/contactService';

export const SUPPORT_CATEGORIES: { value: SupportCategory; label: string }[] =
  [
    { value: 'general', label: 'General Enquiry' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'delivery', label: 'Delivery Problem' },
    { value: 'account', label: 'Account Support' },
  ];

export const contactFormSchema = z.object({
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject must be under 100 characters'),
  category: z.enum(['general', 'billing', 'technical', 'delivery', 'account'],
    { errorMap: () => ({ message: 'Please select a category' }) },
  ),
  message: z
    .string()
    .min(20, 'Message must be at least 20 characters')
    .max(2000, 'Message must be under 2000 characters'),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export interface UseContactFormReturn {
  form: ReturnType<typeof useForm<ContactFormValues>>;
  isSubmitting: boolean;
  isSuccess: boolean;
  ticketId: string | null;
  attachment: File | null;
  attachmentError: string | null;
  handleAttachmentChange: (file: File | null) => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
  resetForm: () => void;
}

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'];

/**
 * useContactForm — orchestrates the support ticket submission flow.
 * Validates with Zod, encodes attachment to base64, calls contactService,
 * and manages success/error state.
 */
export function useContactForm(): UseContactFormReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      subject: '',
      category: undefined,
      message: '',
    },
  });

  const handleAttachmentChange = useCallback((file: File | null) => {
    setAttachmentError(null);
    if (!file) {
      setAttachment(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAttachmentError('Only PNG, JPG, GIF, or PDF files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setAttachmentError(`File size must be under ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    setAttachment(file);
  }, []);

  const encodeToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onSubmit = useCallback(
    async (values: ContactFormValues) => {
      setIsSubmitting(true);
      try {
        let attachmentBase64: string | null = null;
        let attachmentName: string | null = null;

        if (attachment) {
          attachmentBase64 = await encodeToBase64(attachment);
          attachmentName = attachment.name;
        }

        const payload: ContactPayload = {
          ...values,
          attachment: attachmentBase64,
          attachmentName,
        };

        const response: ContactResponse =
          await contactService.submitTicket(payload);

        setTicketId(response.ticketId);
        setIsSuccess(true);
        form.reset();
        setAttachment(null);
      } finally {
        setIsSubmitting(false);
      }
    },
    [attachment, form],
  );

  const resetForm = useCallback(() => {
    setIsSuccess(false);
    setTicketId(null);
    setAttachment(null);
    setAttachmentError(null);
    form.reset();
  }, [form]);

  return {
    form,
    isSubmitting,
    isSuccess,
    ticketId,
    attachment,
    attachmentError,
    handleAttachmentChange,
    onSubmit,
    resetForm,
  };
}