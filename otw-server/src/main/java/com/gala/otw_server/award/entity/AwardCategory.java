package com.gala.otw_server.award.entity;

/**
 * The Barkada Awards categories: a fixed set in code, shared by the API and the app (the app maps each
 * key to an icon and colour). Playful, never mean: every category has a winner and none is a "loser" list.
 * The key is stored in {@code award_votes}, so never rename one.
 * {@code hint} is where a "nominees to consider" nudge comes from; NONE means vote only, because the
 * data has no history for it (travel and RSVP status are stored without timestamps).
 */
public enum AwardCategory {
    TAGASALBA("Ang Tagasalba", "Laging unang nag-abono para umandar ang gala.", Hint.PAID),
    PAMILYA("Ang Padre/Madre de Pamilya", "Dala ang lahat, pati ang hindi mo naisip.", Hint.CHECKLIST),
    LAGING_G("Laging G", "Hindi pa tapos ang tanong, G na agad.", Hint.NONE),
    MAPANGARAPIN("Ang Mapangarapin", "Laging may bagong stop sa isip.", Hint.STOPS),
    CHISMOSO("Ang Chismoso/Chismosa", "Kahit anong oras, may sagot sa GC.", Hint.CHAT),
    UNANG_DATING("Ang Unang Dating", "Nauna pa sa oras ng usapan.", Hint.NONE),
    LATE_ROYALTY("Ang Late King/Queen", "Pinakahuling sumipot, pero sulit pa rin.", Hint.NONE),
    LITRATISTA("Ang Litratista", "Siya ang dahilan kung bakit may ebidensya tayo.", Hint.PHOTOS);

    public enum Hint { PAID, CHECKLIST, STOPS, CHAT, PHOTOS, NONE }

    private final String title;
    private final String blurb;
    private final Hint hint;

    AwardCategory(String title, String blurb, Hint hint) {
        this.title = title;
        this.blurb = blurb;
        this.hint = hint;
    }

    public String title() {
        return title;
    }

    public String blurb() {
        return blurb;
    }

    public Hint hint() {
        return hint;
    }
}
