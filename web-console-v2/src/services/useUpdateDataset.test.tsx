import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from './http';
import { useUpdateDataset } from './dataset';

const mockShowAlert = jest.fn();
jest.mock('contexts/AlertContextProvider', () => ({ useAlert: () => ({ showAlert: mockShowAlert }) }));
jest.mock('./http', () => ({ http: { patch: jest.fn() } }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
);

const failSave = async (error: any, options?: { suppressErrorAlert?: boolean }) => {
    (http.patch as jest.Mock).mockRejectedValueOnce(error);
    const { result } = renderHook(() => useUpdateDataset(options), { wrapper });
    result.current.mutate({ data: { dataset_id: 'd1', version_key: '1' } });
    await waitFor(() => expect(result.current.isError).toBe(true));
};

describe('useUpdateDataset error alert', () => {
    beforeEach(() => mockShowAlert.mockReset());

    it('tells the user to refresh on a 409', async () => {
        await failSave({ response: { status: 409, data: { error: { message: 'outdated' } } } });
        expect(mockShowAlert).toHaveBeenCalledWith(expect.stringMatching(/updated elsewhere/), 'error');
    });

    it("shows the API's error message", async () => {
        await failSave({ response: { status: 400, data: { error: { code: 'DATASET_NOT_IN_DRAFT_STATE_TO_UPDATE', message: 'Dataset is not in draft state' } } } });
        expect(mockShowAlert).toHaveBeenCalledWith('Dataset is not in draft state', 'error');
    });

    it('falls back to a generic message without a response body', async () => {
        await failSave(new Error('Network Error'));
        expect(mockShowAlert).toHaveBeenCalledWith('Failed to save changes. Please try again.', 'error');
    });

    it('stays quiet when the caller suppresses the alert', async () => {
        await failSave({ response: { status: 500, data: {} } }, { suppressErrorAlert: true });
        expect(mockShowAlert).not.toHaveBeenCalled();
    });
});
