import { useMutation } from '@tanstack/react-query';

import { type AgreeTermsInput, termsApi } from './terms-api';

export const useAgreeTermsMutation = () =>
  useMutation({
    mutationFn: (input: AgreeTermsInput) => termsApi.agree(input),
  });
