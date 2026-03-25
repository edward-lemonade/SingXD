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
        // draft CRUD
        init: () => `${API}/draft`,
        get: (uuid: string) => `${API}/draft/${uuid}`,
        update: (uuid: string) => `${API}/draft/${uuid}`,
        delete: (uuid: string) => `${API}/draft/${uuid}`,
        publish: (uuid: string) => `${API}/draft/${uuid}/publish`,
        list: () => `${API}/draft`,
        // editor operations
        separateAudio: (uuid: string) => `${API}/draft/${uuid}/separate-audio`,
        uploadInstrumental: (uuid: string) => `${API}/draft/${uuid}/upload-instrumental`,
        uploadVocals: (uuid: string) => `${API}/draft/${uuid}/upload-vocals`,
        uploadImage: (uuid: string) => `${API}/draft/${uuid}/upload-image`,
        generateTimings: (uuid: string) => `${API}/draft/${uuid}/generate-timings`,
    },
    game: {
        load: (chartId: number) => `${API}/game/${chartId}/load`,
        run: (chartId: number) => `${API_WS}/game/${chartId}/run`,
    },
    user: {
        me: () => `${API}/auth/me`,
    },
    auth: {
        session: () => `${API}/auth/session`,
    },
};
