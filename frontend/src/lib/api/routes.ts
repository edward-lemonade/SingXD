const API = process.env.NEXT_PUBLIC_API_URL
const API_WS = process.env.NEXT_PUBLIC_API_WS_URL

export const ROUTE_CONFIG = {
    chart: {
        get: (chartId: number) =>   `${API}/chart/${chartId}`,
        create: () =>               `${API}/chart`,
    },
    draft: {
        separateAudio: () =>        `${API}/draft/separate-audio`,
        uploadImage: () =>          `${API}/draft/upload-image`,
        generateTimings: () =>      `${API}/draft/generate-timings`,
    },
    game: {
        load: (chartId: number) =>  `${API}/game/${chartId}/load`,
        run: (chartId: number) =>   `${API_WS}/game/${chartId}/run`,
    }
}