export interface AudioFiles {
    combined?: File;
    instrumental?: File;
    vocals?: File;
    combinedURL?: string;
    instrumentalURL?: string;
    vocalsURL?: string;
}

export interface SyncPoint {
    start: number; 
    end: number 
}

export interface SyncLine {
    words: string[];
    start: number; // first word start time
    end: number;   // last word end time
    firstWordIndex: number;
}
export interface SyncLines {
    lines: SyncLine[];
} 