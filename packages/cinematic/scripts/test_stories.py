# ============================================================
# FILE: scripts/test_stories.py
# PURPOSE: Official test stories as Python constants
# USAGE: from scripts.test_stories import TEST_STORIES
# ============================================================

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import CustomerInput, EmotionalTone, VideoStyle

TEST_STORIES = {

    "grief": CustomerInput(
        customer_id="test_grief_001",
        customer_story="""
        Her name was Dorothy Mae Williams and she made the best
        sweet potato pie in the state of Georgia. Every Thanksgiving
        she would start at 4am, just her and the kitchen and the
        gospel music playing low on the radio. I would come downstairs
        as a little girl and she would already have flour on her hands
        and she would look up at me and smile like I was the best thing
        she had ever seen. That smile. I have been trying to find the
        right words for that smile for three years now and I still
        cannot do it justice.

        She passed on a Tuesday in February. It was raining and I was
        sitting in a hospital waiting room reading a magazine I was not
        actually reading and then a doctor came through a door and I
        knew before he even opened his mouth. I knew by the way he
        walked. My mother was 71 years old and she had lived a full
        life and I know I am supposed to find comfort in that but most
        mornings I wake up and my first thought is to call her and then
        I remember and the day has to start all over again.

        What I want people to understand about grief is that it is not
        loud all the time. Sometimes it is very quiet. It is the other
        seat at the dinner table. It is hearing a song she would have
        loved and having nobody to call. It is finding her handwriting
        on a grocery list inside an old coat pocket and having to sit
        down on the kitchen floor. I am learning to carry it
        differently now. Not lighter. Just differently. She would want
        me to keep going and so I keep going. But I keep going with her.
        """,
        emotional_analysis={
            "primary_emotion": "grief",
            "secondary_emotions": ["love", "loneliness", "nostalgia"],
            "emotional_intensity": 0.92,
            "emotional_arc": [
                "warm memory", "sudden loss",
                "daily reality of grief", "quiet acceptance", "carrying forward"
            ],
            "key_images": [
                "empty kitchen at dawn", "flour on hands",
                "hospital waiting room", "empty chair at dinner table",
                "handwriting on grocery list", "kitchen floor"
            ],
            "tone": "quiet, heavy, honest, tender",
            "color_palette": "desaturated_cold"
        },
        primary_emotion=EmotionalTone.GRIEF,
        secondary_emotions=[EmotionalTone.LOVE, EmotionalTone.LONELINESS, EmotionalTone.NOSTALGIA],
        emotional_arc=["warm memory", "sudden loss", "daily reality of grief", "quiet acceptance", "carrying forward"],
        lyrics="""
        Four in the morning, the gospel plays low
        Flour on your hands in the kitchen I know
        You looked up and smiled like I hung every star
        I have been looking for that smile so far

        Tuesday in February the rain hit the glass
        I knew by the walk that the moment had passed
        I reach for the phone in the morning light
        Then I remember and start over the night

        It is not always loud, sometimes grief is a chair
        A handwriting found in a coat I still wear
        I carry you different now, not lighter but real
        You would want me to go on and going I will
        """,
        song_file_url="https://storage.ghaafeedi.com/test/grief_test.mp3",
        song_duration_seconds=195,
        song_bpm=68,
        song_genre="soul ballad",
        video_script="""
        A cinematic journey through quiet grief and enduring love.
        Opens in a warm kitchen at dawn, the ghost of a mother's
        presence. Moves through the cold reality of loss. Finds
        beauty in the small traces left behind. Ends with a daughter
        continuing forward, carrying her mother with her.
        """,
        preferred_style=VideoStyle.DESATURATED_COLD
    ),

    "love": CustomerInput(
        customer_id="test_love_001",
        customer_story="""
        I did not believe in love at first sight until a Thursday
        afternoon in October when Marcus walked into the coffee shop
        where I worked and asked me what I recommended and I said the
        lavender latte and he said he hated lavender and ordered it
        anyway. He came back the next Thursday. And the one after that.
        For six weeks he ordered that lavender latte and I found out
        later he was throwing it away in the trash outside because he
        really did hate lavender but he did not know how to start a
        different conversation and I think about that all the time.
        I think about a man standing outside a coffee shop in the cold
        pouring a drink into a trash can just to have a reason to
        come back inside and talk to me.

        We have been married for four years now. We have a dog named
        Biscuit who sleeps between us and a house with a porch we sit
        on every Sunday morning and we have had hard seasons like
        everyone does but I want to say something true about this man.
        He has never once made me feel like I was too much. I grew up
        believing I was too much. Too loud, too emotional, too
        particular about things. Marcus looked at every part of me
        that I had been apologizing for my entire life and he just
        said yes. All of it. Yes.

        I do not have a dramatic story about our love. There was no
        grand gesture or movie moment. There was just a man who kept
        showing up on Thursdays and kept drinking something he hated
        and kept trying. And I think that is what love actually is.
        Not the fireworks. The showing up. Every single Thursday.
        """,
        emotional_analysis={
            "primary_emotion": "love",
            "secondary_emotions": ["joy", "gratitude", "peace"],
            "emotional_intensity": 0.78,
            "emotional_arc": [
                "unexpected meeting", "slow discovery",
                "being fully accepted", "quiet daily love", "gratitude"
            ],
        },
        primary_emotion=EmotionalTone.LOVE,
        secondary_emotions=[EmotionalTone.JOY, EmotionalTone.GRATITUDE, EmotionalTone.PEACE],
        emotional_arc=["unexpected meeting", "slow discovery", "being fully accepted", "quiet daily love", "gratitude"],
        lyrics="""
        Thursday October you walked through that door
        Asked what I'd recommend then ordered what you'd ignore
        Six weeks of lavender you poured in the cold
        Just to come back in and watch the story unfold

        You never once told me I was ever too much
        Every part I apologized for you said yes to touch
        No grand gesture no fireworks no movie scene
        Just a man who kept showing up in between

        We have a dog named Biscuit and a porch on Sunday light
        Hard seasons come through but you stayed every night
        That is what love is not the fire above
        It is every single Thursday it is showing up
        """,
        song_file_url="https://storage.ghaafeedi.com/test/love_test.mp3",
        song_duration_seconds=210,
        song_bpm=84,
        song_genre="indie pop",
        video_script="""
        A warm cinematic love story told in small moments.
        Coffee shop in golden autumn light. A man standing in
        the cold doing something quietly ridiculous for love.
        Sunday mornings on a porch. The dog. The ordinary
        extraordinary life of two people who chose each other.
        """,
        preferred_style=VideoStyle.WARM_GOLDEN
    ),

    "comeback": CustomerInput(
        customer_id="test_comeback_001",
        customer_story="""
        At thirty four years old I lost everything in eleven months.
        The business went first. Fourteen years of building something
        from a folding table in my garage and it was gone in a quarter.
        Then the marriage, which had been struggling for longer than
        I wanted to admit, finally finished what the financial stress
        started. Then the house because we had to sell it in the
        divorce and I moved into a one bedroom apartment that smelled
        like the previous tenant's cigarettes and I slept on an air
        mattress for four months because I could not bring myself to
        buy a real bed. Buying a bed felt like admitting this was
        my life now.

        I want to tell you about the morning I bought the bed. It was
        a random Wednesday and I woke up on that air mattress for the
        one hundred and nineteenth day in a row and something in me
        just decided. I got up, I drove to the furniture store, I
        bought the least expensive bed frame they had and I put it
        together myself on my living room floor with a YouTube video
        and a screwdriver. It took three hours. I cried twice during
        the assembly. But I finished it and I set it up and I made
        it with the sheets I had and I lay down on it and I stared
        at the ceiling of that cigarette apartment and I said out
        loud to no one: okay. Okay. We are doing this.

        That was twenty two months ago. I have a new business now.
        It is smaller and I am more careful with it and I understand
        things about money and risk and partnership that I did not
        understand before. I still live in the same apartment but
        it does not smell like cigarettes anymore because I painted
        every wall myself and put plants everywhere. I am not who
        I was before. I am someone who knows what he is made of
        now. That is not nothing. That is actually everything.
        """,
        emotional_analysis={
            "primary_emotion": "comeback",
            "secondary_emotions": ["hope", "courage", "triumph"],
            "emotional_intensity": 0.88,
            "emotional_arc": [
                "total collapse", "surviving the bottom",
                "the decision moment", "small act of rebuilding",
                "transformation and pride"
            ],
        },
        primary_emotion=EmotionalTone.COMEBACK,
        secondary_emotions=[EmotionalTone.HOPE, EmotionalTone.COURAGE, EmotionalTone.TRIUMPH],
        emotional_arc=[
            "total collapse", "surviving the bottom",
            "the decision moment", "small act of rebuilding",
            "transformation and pride"
        ],
        lyrics="""
        Fourteen years on a folding table gone in a quarter turn
        Signed the papers on the house I watched us build and burn
        Air mattress on the floor of someone else's cigarette smell
        One hundred nineteen mornings at the bottom of this well

        Wednesday I woke up and something in me said enough
        Drove to the furniture store bought the cheapest one they had
        Three hours on the floor I cried twice through the build
        But I finished it I lay down and I said out loud I will

        Okay okay we are doing this
        The walls are painted now the plants are in the window
        Smaller but more careful now I know what I am made of
        That is not nothing that is actually everything
        """,
        song_file_url="https://storage.ghaafeedi.com/test/comeback_test.mp3",
        song_duration_seconds=225,
        song_bpm=108,
        song_genre="anthemic pop",
        video_script="""
        A cinematic arc from darkness to light. Begins in the
        stripped-back emptiness of the air mattress apartment.
        The single decisive Wednesday morning. Hands assembling
        something from pieces on the floor. A person lying on
        a finished bed staring at the ceiling saying okay.
        Time-lapse of walls being painted. Plants in windows.
        A man who knows what he is made of.
        """,
        preferred_style=VideoStyle.CINEMATIC_TEAL_ORANGE
    ),

    "hope": CustomerInput(
        customer_id="test_hope_001",
        customer_story="""
        I was diagnosed on a Monday in March and by Friday I had
        already planned my funeral in my head. Not the details but
        the feeling of it. I had already decided the outcome and I
        had already started grieving a version of myself that had
        not died yet. My oncologist later told me that this is
        very common. The mind moves fast. The medicine moves slower.

        What nobody tells you about serious illness is how much of
        it is waiting. Waiting rooms and waiting for results and
        waiting to see if the thing that is supposed to help you
        is actually helping you. I became very good at waiting.
        I also became very bad at pretending things were fine when
        they were not and I lost some people who could not handle
        the realness of it and I found some people I never expected
        who showed up every single week without being asked. My
        neighbor Celeste who is seventy one years old started
        leaving soup on my porch every Tuesday. She never knocked.
        She just left it there. I do not know why that kindness
        was the thing that broke me open in the good way but it was.

        I am in remission now. That word still feels strange in my
        mouth, like a word from another language I am still learning
        to pronounce. I am not the same person I was before the
        diagnosis and I mean that as a fact not a complaint. I
        notice things differently now. The particular way light
        comes through my kitchen window at seven in the morning.
        The weight of a good cup of coffee. The fact that I am
        standing in my kitchen at seven in the morning. I am
        standing here. That used to be invisible to me. It is not
        invisible anymore.
        """,
        emotional_analysis={
            "primary_emotion": "hope",
            "secondary_emotions": ["peace", "gratitude", "love"],
            "emotional_intensity": 0.85,
        },
        primary_emotion=EmotionalTone.HOPE,
        secondary_emotions=[EmotionalTone.PEACE, EmotionalTone.GRATITUDE, EmotionalTone.LOVE],
        emotional_arc=[
            "devastating diagnosis", "the long waiting",
            "unexpected kindness breaks through",
            "remission and renewal", "seeing ordinary life as extraordinary"
        ],
        lyrics="""
        Monday in March and the world went still
        By Friday I had already written the will
        The mind moves fast the medicine slow
        I sat in the waiting and learned how to go

        Celeste from next door left soup on my porch
        Never once knocked just a bowl and a torch
        Something about that broke me the good kind of break
        I did not know kindness could feel like an ache

        Remission they said and the word felt like new
        A language I'm learning one morning at a time through
        The light through the window the weight of the cup
        I am standing here standing here standing here up
        """,
        song_file_url="https://storage.ghaafeedi.com/test/hope_test.mp3",
        song_duration_seconds=200,
        song_bpm=76,
        song_genre="ethereal pop",
        video_script="""
        A fragile and luminous journey through illness toward
        renewed life. Cold sterile waiting rooms giving way to
        small acts of human kindness. Morning light becoming
        something sacred. A person learning to see their own
        ordinary life as the miracle it always was.
        """,
        preferred_style=VideoStyle.ETHEREAL_LIGHT
    ),

    "heartbreak": CustomerInput(
        customer_id="test_heartbreak_001",
        customer_story="""
        The thing about loving someone for seven years is that
        they become the architecture of your daily life. They
        are in every routine. They are the reason you bought
        the brand of coffee you buy and the reason you know
        the words to songs you would never have listened to
        on your own and the reason you sleep on a particular
        side of the bed. And then one night they sit across
        from you at the kitchen table you picked out together
        and they say the thing you have been afraid they were
        going to say for longer than you want to admit and
        suddenly the architecture has no roof.

        I am not going to pretend I was perfect in that
        relationship. I was not. I worked too much and I was
        not always present and there were ways I could have
        tried harder that I did not try. But I also know that
        I loved him completely and without reservation and
        I showed up every day intending to be someone he
        could count on. I think we just wanted different
        futures and we waited too long to say that out loud.
        Seven years is a long time to discover you have been
        quietly growing in different directions.

        The apartment feels enormous now. I have started
        leaving the television on just for the sound. I
        reorganized the kitchen so nothing is where it used
        to be because I got tired of reaching for something
        and finding it where he put it instead of where I
        would have put it. Small acts of reclamation. I am
        told this gets easier and I believe the people who
        tell me that because I have to believe something.
        Some nights are very long. But I am still here at
        the end of them and I think that counts for more
        than I am currently giving myself credit for.
        """,
        emotional_analysis={
            "primary_emotion": "heartbreak",
            "secondary_emotions": ["loneliness", "anger", "nostalgia"],
            "emotional_intensity": 0.86,
        },
        primary_emotion=EmotionalTone.HEARTBREAK,
        secondary_emotions=[EmotionalTone.LONELINESS, EmotionalTone.ANGER, EmotionalTone.NOSTALGIA],
        emotional_arc=[
            "love embedded in every daily detail",
            "the ending conversation",
            "honest self-reflection",
            "emptiness of the space left behind",
            "small acts of survival and reclamation"
        ],
        lyrics="""
        Seven years in every coffee brand I own
        Words to songs I would have never known
        A side of the bed that is no longer mine
        You sat across the table and said the last line

        I am not pretending I was without fault
        I worked too much and left the doors without a bolt
        But I showed up I swear I showed up every day
        We just wanted different futures neither could say

        The television stays on for the sound of a voice
        I moved the kitchen around because I needed a choice
        Small acts of reclamation in the enormous room
        I am still here at the end of it still here in the gloom
        """,
        song_file_url="https://storage.ghaafeedi.com/test/heartbreak_test.mp3",
        song_duration_seconds=218,
        song_bpm=92,
        song_genre="indie soul",
        video_script="""
        A neon-lit cinematic portrait of heartbreak in a city
        apartment. The kitchen table where it ended. The enormous
        emptiness of shared spaces now unshared. Television glow
        in darkness. Small deliberate acts of a person slowly
        reclaiming their own life one reorganized shelf at a time.
        """,
        preferred_style=VideoStyle.NEON_NOIR
    ),
}


def get_test_story(emotion: str) -> CustomerInput:
    """Get a test story by emotion name."""
    story = TEST_STORIES.get(emotion.lower())
    if not story:
        available = list(TEST_STORIES.keys())
        raise ValueError(
            f"No test story for emotion '{emotion}'. "
            f"Available: {available}"
        )
    return story


def get_all_test_stories() -> list:
    """Return all 5 test stories as a list."""
    return list(TEST_STORIES.values())
