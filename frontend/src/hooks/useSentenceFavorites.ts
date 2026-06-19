import { useState, useEffect, useCallback } from 'react';
import {
    SavedSentence,
    saveSentence as dbSaveSentence,
    deleteSentence as dbDeleteSentence,
    loadSentences as dbLoadSentences,
} from '../utils/db';

export interface SentenceInput {
    lessonId: string;
    lessonTitle: string;
    text: string;
    start: number;
    end: number;
}

const buildSentenceId = (lessonId: string, start: number) =>
    `${lessonId}__${start.toFixed(3)}`;

export const useSentenceFavorites = () => {
    const [sentences, setSentences] = useState<SavedSentence[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await dbLoadSentences();
                if (!cancelled) {
                    setSentences(list);
                }
            } catch (e) {
                console.warn('Failed to load saved sentences', e);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const isSentenceFavorite = useCallback(
        (lessonId: string, start: number) => {
            const id = buildSentenceId(lessonId, start);
            return sentences.some((s) => s.id === id);
        },
        [sentences]
    );

    const addSentence = useCallback(async (input: SentenceInput) => {
        const id = buildSentenceId(input.lessonId, input.start);
        const record: SavedSentence = {
            id,
            lessonId: input.lessonId,
            lessonTitle: input.lessonTitle,
            text: input.text,
            start: input.start,
            end: input.end,
            createdAt: Date.now(),
        };
        try {
            await dbSaveSentence(record);
            setSentences((prev) => {
                if (prev.some((s) => s.id === id)) return prev;
                return [record, ...prev];
            });
        } catch (e) {
            console.warn('Failed to save sentence', e);
        }
    }, []);

    const removeSentence = useCallback(async (id: string) => {
        try {
            await dbDeleteSentence(id);
            setSentences((prev) => prev.filter((s) => s.id !== id));
        } catch (e) {
            console.warn('Failed to delete sentence', e);
        }
    }, []);

    const toggleSentence = useCallback(
        async (input: SentenceInput) => {
            const id = buildSentenceId(input.lessonId, input.start);
            if (sentences.some((s) => s.id === id)) {
                await removeSentence(id);
            } else {
                await addSentence(input);
            }
        },
        [sentences, addSentence, removeSentence]
    );

    return {
        sentences,
        loaded,
        isSentenceFavorite,
        addSentence,
        removeSentence,
        toggleSentence,
    };
};
