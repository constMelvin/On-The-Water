package com.gala.otw_server.couple.service;

import com.gala.otw_server.couple.entity.CoupleQuizMode;
import com.gala.otw_server.couple.entity.QuizCategory;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The question bank of "Who Knows Who Better?". Scored questions are multiple choice, so "do the answers
 * match" is an exact option-key match (no free-text guessing). Deep Talk questions are open: they are
 * revealed together and never scored. Keys are stored in the database, so never rename one.
 */
public final class CoupleQuizBank {

    public record Option(String key, String label) {}

    public record Question(String key, QuizCategory category, String text, List<Option> options) {
        public CoupleQuizMode mode() {
            return category == QuizCategory.DEEP_TALK ? CoupleQuizMode.DEEP_TALK : CoupleQuizMode.QUIZ;
        }

        public boolean hasOption(String optionKey) {
            return options.stream().anyMatch(o -> o.key().equals(optionKey));
        }
    }

    private static final Map<String, Question> BY_KEY = new LinkedHashMap<>();

    private static Option o(String key, String label) {
        return new Option(key, label);
    }

    private static void quiz(String key, QuizCategory category, String text, Option... options) {
        BY_KEY.put(key, new Question(key, category, text, List.of(options)));
    }

    private static void deep(String key, String text) {
        BY_KEY.put(key, new Question(key, QuizCategory.DEEP_TALK, text, List.of()));
    }

    static {
        // Favorites
        quiz("FAV_COMFORT_FOOD", QuizCategory.FAVORITES, "What's your comfort food?",
                o("RICE", "A rice meal"), o("NOODLES", "Noodles"), o("SWEETS", "Something sweet"), o("SNACKS", "Fried snacks"));
        quiz("FAV_DRINK", QuizCategory.FAVORITES, "What's your go-to drink?",
                o("COFFEE", "Coffee"), o("MILK_TEA", "Milk tea"), o("SODA", "Soda"), o("WATER", "Water or juice"));
        quiz("FAV_WEATHER", QuizCategory.FAVORITES, "What's your favorite weather?",
                o("SUNNY", "Sunny"), o("RAINY", "Rainy"), o("COOL", "Cool and breezy"), o("CLOUDY", "Cloudy"));
        quiz("FAV_TRIP", QuizCategory.FAVORITES, "What's your dream kind of trip?",
                o("BEACH", "Beach"), o("MOUNTAIN", "Mountains"), o("CITY", "City"), o("ROAD_TRIP", "Road trip"));
        quiz("FAV_MOVIE", QuizCategory.FAVORITES, "What do you pick for movie night?",
                o("ROMCOM", "Rom-com"), o("ACTION", "Action"), o("HORROR", "Horror"), o("COMEDY", "Comedy"));

        // Habits
        quiz("HAB_CLOCK", QuizCategory.HABITS, "Are you a morning or night person?",
                o("MORNING", "Morning"), o("NIGHT", "Night"), o("DEPENDS", "Depends on the day"));
        quiz("HAB_TEXTING", QuizCategory.HABITS, "How do you text?",
                o("INSTANT", "Instant replies"), o("WHEN_FREE", "When I'm free"), o("LATE", "Hours later"), o("CALL", "I'd rather call"));
        quiz("HAB_TIME", QuizCategory.HABITS, "When you have plans, you're usually...",
                o("EARLY", "Early"), o("ON_TIME", "On time"), o("LATE", "Late"));
        quiz("HAB_STRESS", QuizCategory.HABITS, "When stressed, you...",
                o("TALK", "Talk it out"), o("ALONE", "Want some space"), o("SLEEP", "Sleep"), o("EAT", "Eat"));
        quiz("HAB_PACKING", QuizCategory.HABITS, "Your packing style?",
                o("EARLY", "Days early"), o("LAST_MINUTE", "Last minute"), o("OVERPACK", "Overpack"), o("MINIMAL", "Bare minimum"));

        // Love languages
        quiz("LL_RECEIVE", QuizCategory.LOVE_LANGUAGES, "What makes you feel most loved?",
                o("WORDS", "Kind words"), o("TIME", "Quality time"), o("GIFTS", "Gifts"), o("SERVICE", "Helpful acts"), o("TOUCH", "Hugs and touch"));
        quiz("LL_GIVE", QuizCategory.LOVE_LANGUAGES, "How do you show love?",
                o("WORDS", "Kind words"), o("TIME", "Quality time"), o("GIFTS", "Gifts"), o("SERVICE", "Helpful acts"), o("TOUCH", "Hugs and touch"));
        quiz("LL_SURPRISE", QuizCategory.LOVE_LANGUAGES, "What's the best surprise?",
                o("NOTE", "A sweet note"), o("DATE", "A planned date"), o("GIFT", "A small gift"), o("FOOD", "Your favorite food"));
        quiz("LL_APPRECIATED", QuizCategory.LOVE_LANGUAGES, "You feel appreciated when someone...",
                o("THANKS", "Says thank you"), o("HELPS", "Helps without asking"), o("LISTENS", "Really listens"), o("REMEMBERS", "Remembers small things"));

        // Preferences
        quiz("PREF_DATE", QuizCategory.PREFERENCES, "What's your perfect date?",
                o("HOME", "Cozy at home"), o("OUTDOOR", "Outdoors"), o("FOOD_TRIP", "A food trip"), o("ADVENTURE", "Something new"));
        quiz("PREF_PLANS", QuizCategory.PREFERENCES, "Plans or spontaneous?",
                o("PLANNED", "Plan everything"), o("SPONTANEOUS", "Go with the flow"), o("MIX", "A bit of both"));
        quiz("PREF_SPLURGE", QuizCategory.PREFERENCES, "You'd splurge on...",
                o("FOOD", "Food"), o("EXPERIENCES", "Experiences"), o("STUFF", "Things I love"), o("SAVE", "I'd rather save"));
        quiz("PREF_PHOTOS", QuizCategory.PREFERENCES, "How do you feel about photos?",
                o("LOVE", "Take lots"), o("SOME", "A few is enough"), o("CANDID", "Only candid ones"), o("SHY", "Please no"));
        quiz("PREF_SEAT", QuizCategory.PREFERENCES, "On a trip, you want...",
                o("WINDOW", "The window seat"), o("AISLE", "The aisle"), o("DRIVER", "To drive"), o("ANY", "Anywhere is fine"));

        // Deep talk
        deep("DT_CARED", "What's something I do that makes you feel cared for?");
        deep("DT_RELIVE", "What's a moment with me you'd happily relive?");
        deep("DT_MORE", "What's one thing you'd like us to do more of?");
        deep("DT_DREAM", "What's a dream you haven't told many people about?");
        deep("DT_FEAR", "What's a worry you rarely say out loud?");
        deep("DT_PROUD", "What's something you're proud of us for?");
        deep("DT_FIGHT", "How would you like us to handle disagreements?");
        deep("DT_ORDINARY", "What does a perfect ordinary day with me look like?");
        deep("DT_SMALL", "What's a small thing I do that you love?");
        deep("DT_LEARN", "What's something you'd like us to learn or try together?");
        deep("DT_FUTURE", "Where would you like us to be in five years?");
        deep("DT_ASK", "What's something you've been wanting to ask me?");
    }

    private CoupleQuizBank() {}

    public static Question byKey(String key) {
        return BY_KEY.get(key);
    }

    /** Questions of a mode, optionally one category (null = all categories of that mode). */
    public static List<Question> candidates(CoupleQuizMode mode, QuizCategory category) {
        return BY_KEY.values().stream()
                .filter(q -> q.mode() == mode)
                .filter(q -> category == null || q.category() == category)
                .toList();
    }
}
