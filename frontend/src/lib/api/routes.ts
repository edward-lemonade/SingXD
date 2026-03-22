const API = process.env.NEXT_PUBLIC_API_URL;
const API_WS = process.env.NEXT_PUBLIC_API_WS_URL;

export const ROUTE_CONFIG = {
    chart: {
        get: (chartId: number) => `${API}/chart/${chartId}`,
        create: () => `${API}/chart`,
        list: (page: number, limit: number, search: string) => {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                ...(search ? { search } : {}),
            });
            return `${API}/charts?${params}`;
        },
    },
    draft: {
        separateAudio: () => `${API}/draft/separate-audio`,
        uploadInstrumental: () => `${API}/draft/upload-instrumental`,
        uploadVocals: () => `${API}/draft/upload-vocals`,
        uploadImage: () => `${API}/draft/upload-image`,
        generateTimings: () => `${API}/draft/generate-timings`,
        init: () => `${API}/draft/init`,
        list: () => `${API}/drafts`,
        get: (id: string) => `${API}/drafts/${id}`,
        update: (id: string) => `${API}/drafts/${id}`,
        delete: (id: string) => `${API}/drafts/${id}`,
        publishAsUser: (id: string) => `${API}/drafts/${id}/publish-as-user`,
        publishAsGuest: (id: string) => `${API}/drafts/${id}/publish-as-guest`,
    },
    game: {
        load: (chartId: number) => `${API}/game/${chartId}/load`,
        run: (chartId: number) => `${API_WS}/game/${chartId}/run`,
    },
    user: {
        me: () => `${API}/user/me`,
    },
};
