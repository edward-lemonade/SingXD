import CreateClient from './CreatePageClient';

interface PageProps {
    searchParams: Promise<{ uuid?: string }>;
}

export default async function CreatePage({ searchParams }: PageProps) {
    const { uuid } = await searchParams;
    return <CreateClient initialDraftUuid={uuid} />;
}
