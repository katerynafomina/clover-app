import AsyncStorage from '@react-native-async-storage/async-storage';

const FEEDBACK_KEY = 'user_feedback';

type FeedbackEntry = {
    subcategories: string[];
    weather: string;
    temperature: number;
    feedback: boolean;
};

export async function saveFeedback(entry: FeedbackEntry) {
    try {
        const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
        const data: FeedbackEntry[] = raw ? JSON.parse(raw) : [];
        data.push(entry);
        await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving feedback:', error);
    }
}

export async function loadFeedback(): Promise<Record<string, number>> {
    try {
        const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
        const data: FeedbackEntry[] = raw ? JSON.parse(raw) : [];

        const stats: Record<string, number> = {};
        for (const entry of data) {
            for (const sub of entry.subcategories) {
                stats[sub] = (stats[sub] ?? 0) + (entry.feedback ? 1 : -1);
            }
        }
        return stats;
    } catch (error) {
        console.error('Error loading feedback:', error);
        return {};
    }
}
