// ==UserScript==
// @name         EmuControl Companion
// @namespace    https://emucontrol.emufam.com/
// @version      0.1.276
// @description  EmuControl Companion for TornPDA and userscript managers. Shared calls, BSP estimates, timers, alerts, and attack support.
// @author       EmuControl
// @license      MIT
// @downloadURL  https://emucontrol.emufam.com/emu-war-caller-pda.user.js
// @updateURL    https://emucontrol.emufam.com/emu-war-caller-pda.user.js
// @match        https://www.torn.com/*
// @match        https://emucontrol.emufam.com/*
// @match        https://emucontrol.170.64.146.241.sslip.io/*
// @connect      emucontrol.emufam.com
// @connect      emucontrol.170.64.146.241.sslip.io
// @connect      www.torntraders.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
    "use strict";

    const DASHBOARD_ORIGIN = "https://emucontrol.emufam.com";
    const PENNYWISE_REVIVE_API = "https://www.torntraders.com/api/revive-request";
    const OPENMARKET_VERSION = "1.0.1";
    const DASHBOARD_PINNED_TARGETS_KEY = "emu.chainPinnedTargets.v1";
    const DASHBOARD_PINNED_TARGETS_EVENT = "emu:chain-pinned-targets-changed";
    const TORN_CUSTOM_KEY_URL = "https://www.torn.com/preferences.php#tab=api?step=addNewKey&title=EmuControl&user=profile,bars,cooldowns,networth,honors,jobpoints,personalstats,battlestats,workstats,skills,bazaar,job,log&faction=basic,members,chain,attacks,attacksfull,rankedwars,wars,rankedwarreport,chains,chainreport,warfare,crimes,crime,news,armorynews,contributors,drugs&market=bazaar,itemmarket&torn=items,organizedcrimes,logtypes,rankedwarreport,rankedwars";
    const TORN_FULL_ACCESS_KEY_URL = "https://www.torn.com/preferences.php#tab=api";
    const STORAGE = {
        apiKey: "emu-war-caller.apiKey",
        enabled: "emu-war-caller.enabled",
        panelOpen: "emu-war-caller.panelOpen",
        activeTab: "emu-war-caller.activeTab",
        universalCollapsed: "emu-war-caller.universalCollapsed.v1",
        autoSort: "emu-war-caller.autoSort.v2",
        autoList: "emu-war-caller.autoList",
        allianceBlocker: "emu-war-caller.allianceBlocker.v1",
        chainFlash: "emu-war-caller.chainFlash",
        chainBeep: "emu-war-caller.chainBeep",
        chainMinHits: "emu-war-caller.chainMinHits",
        chainAlertBelow: "emu-war-caller.chainAlertBelow",
        chainSnapshot: "emu-war-caller.chainSnapshot.v1",
        speedMode: "emu-war-caller.speedMode",
        lastState: "emu-war-caller.lastState.v1",
        seenRallies: "emu-war-caller.seenRallies.v1",
        seenAnnouncements: "emu-war-caller.seenAnnouncements.v1",
        seenWarBriefs: "emu-war-caller.seenWarBriefs.v1",
        seenTerritoryAlerts: "emu-war-caller.seenTerritoryAlerts.v1",
        recentChainTargets: "emu-war-caller.recentChainTargets.v1",
        favoriteTargets: "emu-war-caller.favoriteTargets.v1",
        launcherPosition: "emu-war-caller.launcherPosition.v1",
        notificationPosition: "emu-war-caller.notificationPosition.v1",
        pinnedTargets: "emu-war-caller.pinnedTargets.v1",
        bspCache: "emu-war-caller.bspCache.v2",
        factionProfileCache: "emu-war-caller.factionProfileCache.v2",
        warStatusCache: "emu-war-caller.warStatusCache.v3",
        attackContext: "emu-war-caller.attackContext.v1",
        allianceChatOpen: "emu-war-caller.allianceChatOpen.v1",
        allianceChatSeenAt: "emu-war-caller.allianceChatSeenAt.v1",
        allianceChatSeenId: "emu-war-caller.allianceChatSeenId.v1",
        familyChatOpen: "emu-war-caller.familyChatOpen.v1",
        familyChatSeenAt: "emu-war-caller.familyChatSeenAt.v1",
        familyChatSeenId: "emu-war-caller.familyChatSeenId.v1",
        openMarketEnabled: "emu-war-caller.openMarket.enabled.v1",
        openMarketItemMarket: "emu-war-caller.openMarket.itemMarket.v1",
        openMarketAuctionHouse: "emu-war-caller.openMarket.auctionHouse.v1",
        openMarketBazaar: "emu-war-caller.openMarket.bazaar.v1"
    };
    const STATE_POLL_MS = 5000;
    const CALL_STATE_POLL_MS = 1500;
    const STATUS_TICK_MS = 1000;
    const CHAIN_STATE_POLL_MS = 10000;
    const ASSISTANCE_POLL_MS = 5000;
    const ALLIANCE_CHAT_POLL_MS = 3000;
    const ALLIANCE_CHAT_CLOSED_POLL_MS = 60000;
    const ALLIANCE_CHAT_MAX_LENGTH = 400;
    const ALLIANCE_CHAT_GIF_MAX_LENGTH = 700;
    const ANNOUNCEMENT_MAX_LENGTH = 240;
    const ANNOUNCEMENT_VISIBLE_SECONDS = 5 * 60;
    const WAR_BRIEF_MAX_LENGTH = 600;
    const VERSION_CHECK_DELAY_MS = 4500;
    const HEARTBEAT_MS = 60000;
    const API_TIMEOUT_MS = 35000;
    const RUNTIME_VERSION = "0.1.276";
    const RUNTIME_MARKER = "data-emu-war-caller-runtime";
    const RUNTIME_BRAND = "emu";
    const PAGE_DATA_ENDPOINT_PATTERN = /(?:getwarusers|warusers|getwardata|getprocessbarrefreshdata|factionsrankedwarprocessbarrefresh|attackdata)/i;
    const CALLER_INLINE_STATUS_PATTERN = /\byour\s+faction\s+is\s+(?:not\s+)?in\s+a\s+war\b/i;
    const CALLER_INLINE_ACTIVE_WAR_PATTERN = /\blead\s+target\b/i;
    const SCAN_DEBOUNCE_MS = 120;
    const PAGE_DATA_DEBOUNCE_MS = 250;
    const PAGE_DATA_ROW_REFRESH_MS = 2500;
    const ROUTE_WATCH_MS = 350;
    const BUTTON_COOLDOWN_MS = 5000;
    const ATTACK_RELEASE_RETRY_MS = [750, 2000, 5000];
    const RALLY_RETRY_COOLDOWN_MS = 750;
    const BSP_BATCH_SIZE = 150;
    const BSP_FAST_CACHE_BATCH_SIZE = 150;
    const BSP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
    const BSP_MISSING_RETRY_MS = 30 * 1000;
    const FACTION_PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    const FACTION_PROFILE_LIVE_TTL_MS = 60 * 1000;
    const WAR_STATUS_REFRESH_MS = 5 * 1000;
    const WAR_STATUS_CACHE_TTL_MS = 10 * 60 * 1000;
    const MED_OUT_PRIORITY_MS = 15 * 60 * 1000;
    const TELEMETRY_DRUG_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAARCAYAAADZsVyDAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGUSURBVDhPrZSxctNAFEWPtWtpiZWsoLHHDGMoUjIpXPArfA4NX8H/UAc6d3YXAyarQc48yytDAVa88uJxkdNodFc6enpP2t50Ov3NGeQjoboz3fi/JN0ghjYNmd1045OcJc5HginqbnySqFibphuhza5z3px8WFRsJxXF63V7rjIfrJui5uW7H4hLg/yQqLhc5AyGD4GcgyqHN/eUizxY6xIVe1GslxdHlQMMb+7xkuDmgyDvciTWpkGbBjcfIC7FTiqajcZLgp1UACy/vAiujdE7/I61abCTinwkiEvZlCmZ/TsgLwmmqNu+7ge3mtlorwPxHlPUmGJLZmu0eRycF/3vmLBePosK9xy1AkBcirg+XhK02VEuLlspwKbM8KKCe7pEK9amIR8JXhTVnWlbtJrZ9m3e9q94/+YKgNtvNZ9uwyFHK/aicPNBdG8Ql+LmA7YPGn+xpT+O/+pR8VNwltiLYjWzQXZdKFStaErNq0vF9fPHGQCo8Xj8IUjO5Ov3Lb1dgt4lfPz8i58S7iXR4T0FfwAQ3Z6pzSuluQAAAABJRU5ErkJggg==";
    const TELEMETRY_MEDICAL_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJSSURBVDhPzZS/TxNhGMc/JVdOjsJ7Fw4HrEfQ1XZBsZCghDCwdHLRjsZEa+K/orujGzHBwRgoCwnBxKT8SKAQY116qVhoe+3Ra6HUFBdp6J0oRAa/4/Pj837f533y+oaHh4+5ZHW4A5eh/xMajUaJRqNtsQtBhRDEYjGmp6cRQjA5OUkgEGB+fr6tznfehxJC8OT5C8bv3kaWZZaXl8lkMszMzNBoNNpqz+VUCMH4w6fUOq4AIMsyiqIwMDCAoiju8r9DhRDce/SMtYpMuSHxNZNFkiQikQjBYBAhhLvlz1AhBPdjcVb3ZQxdoxm4inVwzNbnLxSLRbLZLLZtu9vOhp4AV2w/hq5i6CrXdZXvPo3ZVJ4PnzZIJpMXg0YePGbF7sTQNQZ1lUFdxXJqbJo5vpUdcltJFhcX3W1wFjQUCpH1aS2Hhq5SqNTYyOSoOSWMvVUSiYS7raXfQm3b5la/8suhRtE5YNPMceCUGdxb8+ylW23QsbExDMPANE2uUeJGfy+FSpWNzA7VioWxt8rc3By1UA/OiIpzR+VY9vpqLX88HmdiYoJCoUA6naZUKmFVavTdvEV6t0xgd7t1ZWdEpS/YTXGnSvf6Pr56sw3aOqarqwtN05AkCVmWyefzvJ99y7vXL/n45pVnhn7J6/BErUwqlaJerzM0NMTU1BSjo6MIITwr0+jvpNkBTuWIJvCjV2rLcxq6sLBAIpGgWq1yeHiIZVkeIIA/f0TP+j5OoY6y7eDPH7lLvB9KOBwmHA6ztLSEaZqnU+eWB3oZOnva/6CfEnnk17f6Se4AAAAASUVORK5CYII=";
    const TELEMETRY_ENERGY_ICON = '<svg viewBox="4.5 5 11 11" aria-hidden="true"><path d="M123,330l1-5h-4l7-6-1,5h4Z" transform="translate(-115 -314)"></path></svg>';
    const TELEMETRY_BOOSTER_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2l2.05 4.15 4.58.67-3.31 3.22.78 4.56L8 11.65 3.9 13.8l.78-4.56-3.31-3.22 4.58-.67L8 1.2z"></path></svg>';
    const TRAVEL_COUNTRY_TIMES = {
        "mexico": { label: "MX", airstrip: 18 },
        "cayman islands": { label: "CI", airstrip: 25 },
        "cayman": { label: "CI", airstrip: 25 },
        "canada": { label: "CA", airstrip: 29 },
        "hawaii": { label: "HI", airstrip: 94 },
        "united kingdom": { label: "UK", place: "London", airstrip: 111 },
        "uk": { label: "UK", place: "London", airstrip: 111 },
        "argentina": { label: "AR", airstrip: 117 },
        "switzerland": { label: "SW", airstrip: 123 },
        "japan": { label: "JP", airstrip: 158 },
        "china": { label: "CN", airstrip: 169 },
        "united arab emirates": { label: "UAE", airstrip: 190 },
        "uae": { label: "UAE", airstrip: 190 },
        "south africa": { label: "SA", airstrip: 208 },
        "torn": { label: "TC", airstrip: 0 },
        "torn city": { label: "TC", airstrip: 0 }
    };
    const HOSPITAL_COUNTRY_ALIASES = {
        "mexican": "mexico",
        "caymanian": "cayman islands",
        "canadian": "canada",
        "hawaiian": "hawaii",
        "british": "united kingdom",
        "english": "united kingdom",
        "argentinian": "argentina",
        "argentine": "argentina",
        "argentinean": "argentina",
        "swiss": "switzerland",
        "japanese": "japan",
        "chinese": "china",
        "emirati": "united arab emirates",
        "south african": "south africa"
    };
    const PERSISTENT_CACHE_MAX_PLAYERS = 1200;
    const CHAIN_TARGET_RECENT_MS = 24 * 60 * 60 * 1000;
    const CHAIN_TARGET_INACTIVE_SECONDS = 200 * 24 * 60 * 60;
    const CHAIN_TARGET_STAT_TIERS = [500, 2000, 5000, 20000];
    const CHAIN_TARGET_SEARCH = "/api/chain-targets/ready?limit=1&consume=1";
    const CHAIN_ALERT_MIN_HITS = 25;
    const CHAIN_ALERT_THRESHOLDS = [60, 90, 120, 150, 180, 210];
    const PRECALL_WINDOW_SECONDS = 3 * 60;
    const POST_HOSPITAL_CALL_SECONDS = 2 * 60;

    const state = {
        calls: new Map(),
        rallies: [],
        events: [],
        announcements: [],
        allianceChatMessages: [],
        allianceChatLoaded: false,
        allianceChatUnread: 0,
        allianceChatMentionUnread: 0,
        allianceChatMentionUsers: [],
        allianceChatTimer: 0,
        allianceChatInFlight: false,
        allianceChatLastSyncAt: 0,
        allianceChatSending: false,
        allianceChatRenderSignature: "",
        allianceChatFailureCount: 0,
        allianceChatGifObserver: null,
        allianceChatError: "",
        allianceChatPositionBound: false,
        allianceChatForceLatest: false,
        allianceChatNewBoundaryId: "",
        allianceChatUnreadJumpPending: false,
        allianceChatOpenSeenAt: 0,
        allianceChatOpenSeenId: "",
        allianceChatAwaitingOpenSync: false,
        familyChatMessages: [],
        familyChatLoaded: false,
        familyChatUnread: 0,
        familyChatMentionUnread: 0,
        familyChatMentionUsers: [],
        familyChatTimer: 0,
        familyChatInFlight: false,
        familyChatLastSyncAt: 0,
        familyChatSending: false,
        familyChatRenderSignature: "",
        familyChatFailureCount: 0,
        familyChatGifObserver: null,
        familyChatError: "",
        familyChatPositionBound: false,
        familyChatForceLatest: false,
        familyChatNewBoundaryId: "",
        familyChatUnreadJumpPending: false,
        familyChatOpenSeenAt: 0,
        familyChatOpenSeenId: "",
        familyChatAwaitingOpenSync: false,
        chatMentionNotifiedIds: new Set(),
        warBrief: null,
        warControl: null,
        territoryAlerts: [],
        owner: null,
        faction: null,
        allianceAudience: "nameless_alliance",
        allianceFactionIds: new Set(),
        membersOnline: [],
        memberTelemetryById: new Map(),
        warId: null,
        connected: false,
        lastError: "",
        bspError: "",
        panelBuilt: false,
        scanTimer: 0,
        stateTimer: 0,
        callStateTimer: 0,
        statusTimer: 0,
        warStatusTimer: 0,
        chainStateTimer: 0,
        assistanceTimer: 0,
        heartbeatTimer: 0,
        syncInFlight: false,
        callStateInFlight: false,
        heartbeatInFlight: false,
        chainStateInFlight: false,
        assistanceInFlight: false,
        chainSnapshotLoaded: false,
        chainSnapshot: null,
        sharedChainOrder: null,
        pageDataTimer: 0,
        pageDataDirty: false,
        lastPageDataScanAt: 0,
        buttonCooldowns: new Map(),
        buttonFeedback: new Map(),
        rallyCooldownUntil: 0,
        rallyPending: false,
        optimisticRally: null,
        hiddenRallyIds: new Set(),
        canAnnounce: false,
        announcementPermissionKnown: false,
        announcementPending: false,
        announcementDraft: "",
        warBriefPending: false,
        warBriefDraft: "",
        warBriefEditing: false,
        lastFightEventKey: "",
        attackCompleteTargetId: null,
        attackCompleteCallReleasedTargetId: null,
        lastChainAlertKey: "",
        pageData: {
            warUsers: null,
            warData: null,
            processBar: null,
            attackData: null,
            onlineStatus: null,
            statusFeed: null,
            advancedSearch: [],
            hallOfFame: []
        },
        hallOfFameTransientRecords: [],
        hallOfFamePrimeRecords: [],
        hallOfFameRecordSource: "",
        hallOfFamePrimeRouteKey: "",
        hallOfFamePrimePending: false,
        hallOfFameBootstrapTimer: 0,
        hallOfFameBootstrapStartedAt: 0,
        hallOfFameBootstrapSignature: "",
        hallOfFameBootstrapStablePasses: 0,
        advancedSearchPayloadRevision: 0,
        advancedSearchRecordsRevision: -1,
        advancedSearchRecordsAt: 0,
        advancedSearchRecords: [],
        advancedSearchRecordSource: "",
        advancedSearchRefreshFrame: 0,
        advancedSearchAwaitingPayload: false,
        targetMeta: new Map(),
        targetMetaRevision: 0,
        warStatusById: new Map(),
        warStatusFetchedAt: new Map(),
        warStatusRosterKey: new Map(),
        warStatusPending: new Set(),
        exactWarStatusRefreshes: new Map(),
        hospitalStateById: new Map(),
        hospitalReleaseEdges: new Map(),
        recentMedOutById: new Map(),
        hospitalizedCallSuppressions: new Map(),
        hospitalVerifyInFlight: new Set(),
        hospitalVerifyLastCheckedAt: new Map(),
        hospitalReleaseInFlight: new Set(),
        bspPredictions: new Map(),
        bspRosterKey: "",
        bspLastFetch: 0,
        bspPending: false,
        bspQueuedIds: new Set(),
        bspQueuedForce: false,
        pinnedTargets: new Set(),
        favoriteTargets: [],
        favoriteTargetsSyncPromise: null,
        favoriteTargetsLoadedAt: 0,
        attackReleaseInFlight: new Set(),
        attackReleaseRetryTimers: new Map(),
        catSort: { enemy: { key: "clock", direction: "asc" }, own: { key: "clock", direction: "asc" } },
        factionSwitchTimer: 0,
        warObservers: new Map(),
        settingsEditing: false,
        panelMarkup: "",
        panelMarkupTab: "",
        sleeping: false,
        initialized: false,
        visibilityBound: false,
        routeLifecycleBound: false,
        routeLifecycleTimer: 0,
        routeLifecycleHref: String(location.href || ""),
        routeLifecycleWatchTimer: 0,
        sleepRouteTimer: 0,
        routeTransitionUntil: 0,
        finishedReportHref: "",
        identityBootstrapRoute: "",
        identityBootstrapAttempted: false,
        mainObserver: null,
        factionProfiles: new Map(),
        factionLoads: new Set(),
        warOpponent: null,
        activeRankedWar: null,
        warOpponentPending: false,
        warOpponentResolved: false,
        warOpponentLoadedAt: 0,
        activeRankedWarId: "",
        factionSnapshotPending: false,
        factionSnapshotLoadedAt: 0,
        factionSnapshotRosterKey: "",
        updateCheckScheduled: false,
        updateCheckCompleted: false,
        updateCheckInFlight: false,
        updateCheckFailed: false,
        updateAvailableVersion: "",
        latestCompanionVersion: "",
        reviveRequestPending: false,
        targetRows: new Map(),
        warListingMounted: false,
        inlineStatusCard: null,
        inlineSlot: null,
        inlineAnchorLookupAt: 0,
        inlineRootRecoveryAttempted: false,
        launcherClickSuppressUntil: 0,
        launcherDragBound: false,
        warHeaderCache: new WeakMap(),
        attackHydrationScheduled: false,
        attackUiReady: false,
        attackAllianceFactionId: 0,
        attackAllianceViewStyle: "",
        attackAllianceOverrideKey: "",
        attackResultObserver: null,
        attackResultTimer: 0,
        openMarketLoading: false,
        openMarketLoaded: false,
        openMarketError: ""
    };

    if (location.hostname === "emucontrol.emufam.com" || location.hostname === "emucontrol.170.64.146.241.sslip.io") {
        onDashboardPage();
        return;
    }

    if (!location.hostname.endsWith("torn.com")) return;

    if (!claimRuntimeSingleton()) return;

    bootstrapOpenMarketModule();
    if (isAttackPage()) installAllianceAttackDataBridge();
    if (!isAttackPage()) installPageDataBridge();
    installRouteLifecycle();
    onReady(start);

    function claimRuntimeSingleton() {
        const root = document.documentElement;
        const sharedWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        const activeRuntime = root?.getAttribute(RUNTIME_MARKER) || sharedWindow?.__emuWarCallerRuntimeActive || "";
        if (activeRuntime) return false;
        const runtimeToken = `${RUNTIME_BRAND}:${RUNTIME_VERSION}`;
        root?.setAttribute(RUNTIME_MARKER, runtimeToken);
        if (sharedWindow) sharedWindow.__emuWarCallerRuntimeActive = runtimeToken;
        return true;
    }

    function openMarketPageType() {
        const path = String(location.pathname || "").toLowerCase();
        let sid = "";
        try {
            sid = String(new URL(location.href).searchParams.get("sid") || "").toLowerCase();
        } catch (err) { }
        if (/\/(?:page|loader)\.php$/i.test(path) && sid === "itemmarket") return "itemMarket";
        if (/\/amarket\.php$/i.test(path)) return "auctionHouse";
        if (/\/bazaar\.php$/i.test(path)) return "bazaar";
        return "";
    }

    function openMarketEnabledForPage(pageType = openMarketPageType()) {
        if (!pageType || !getBool(STORAGE.openMarketEnabled, true)) return false;
        if (pageType === "itemMarket") return getBool(STORAGE.openMarketItemMarket, true);
        if (pageType === "auctionHouse") return getBool(STORAGE.openMarketAuctionHouse, true);
        if (pageType === "bazaar") return getBool(STORAGE.openMarketBazaar, true);
        return false;
    }

    function bootstrapOpenMarketModule() {
        if (!openMarketEnabledForPage() || state.openMarketLoaded || state.openMarketLoading) return;
        state.openMarketLoading = true;
        try {
            runBundledOpenMarketModule();
        } finally {
            state.openMarketLoading = false;
            if (state.panelBuilt && getValue(STORAGE.activeTab, "faction") === "settings" && !state.settingsEditing) renderPanel();
        }
    }

    function runBundledOpenMarketModule() {
        if (!openMarketEnabledForPage()) return false;
        const pageWindow = typeof unsafeWindow !== "undefined" && unsafeWindow ? unsafeWindow : window;
        if (pageWindow?.__emuOpenMarketVersion === OPENMARKET_VERSION) {
            state.openMarketLoaded = true;
            state.openMarketError = "";
            return true;
        }

        const nativeAddEventListener = document.addEventListener;
        const readyListeners = [];
        const replayReady = document.readyState !== "loading";
        if (replayReady) {
            document.addEventListener = function (type, listener, options) {
                if (type === "DOMContentLoaded" && typeof listener === "function") {
                    readyListeners.push(listener);
                    return;
                }
                return nativeAddEventListener.call(this, type, listener, options);
            };
        }

        try {
            /*
             * OpenMarket v1.0.1 by its original author.
             * Source: https://greasyfork.org/en/scripts/571158-openmarket
             * License: GNU GPLv3.
             * Vendored from the verified upstream source. Only the outer window binding is
             * adapted so TornPDA can run it without unsafe-eval and respect Companion toggles.
             */
            (function (window) {
                'use strict';

                // Choose which pages the script is active on.
                // Change "true" to "false" to disable a page.
                const CONFIG = {
                    enableItemMarket: true,
                    enableAuctionHouse: true,
                    enableBazaar: true
                };

                // You can customise the colours however you want. Tiers for quality are lowest to highest.
                const COLOURS = {
                    tiers: {
                        dark: ['#e4e4e4', '#57efea', '#c286ff', '#ffd700'],
                        light: ['#717171', '#009590', '#8e19c1', '#e37100']
                    },
                    bonus: {
                        dark: '#e8d1ff',
                        light: '#370b40'
                    },
                    qualityBoxBg: {
                        dark: 'rgba(0,0,0,0.8)',
                        light: 'rgba(255,255,255,0.9)'
                    }
                };

                // These are the various elements that need to be found/selected within the page source.
                // Changes to the game may break these, so finding the new values may be a necessary part
                // of debugging the script. If an element is broken, you can right click on it and "inspect"
                // to get to the HTML/CSS. This may lead you to the right place, or you might need to dig around.
                const SELECTORS = {
                    itemMarket: {
                        root: '#item-market-root',
                        tile: '[class*="itemTile___"]',
                        imageWrapper: '[class*="imageWrapper___"]',
                        title: 'div > [class*="title___"]',
                        price: '[class*="priceAndTotal___"] span',
                        statsContainer: '[class*="properties___"]',
                        statEntry: '[class*="property___"]',
                        statIcon: '[class*="icon___"]',
                        statValue: '[class*="value___"]',
                        statTypeElement: 'value',
                        statTypeAttribute: 'aria-label',
                        bonusIcons: '[class*="bonuses___"] i'
                    },
                    auctionHouse: {
                        root: '#auction-house-tabs',
                        visibleTab: '#auction-house-tabs .tabContent:not([style*="display: none"])',
                        tile: 'ul.items-list li',
                        imageWrapper: '.img-wrap',
                        title: '.title',
                        itemHover: '.item-hover',
                        rarityLine: 'p.t-gray-6',
                        statsContainer: '.infobonuses',
                        statEntry: 'span.bonus-attachment',
                        statIcon: 'i',
                        statValue: '.label-value',
                        statTypeElement: 'icon',
                        statTypeAttribute: 'className',
                        bonusIcons: '.iconsbonuses .bonus-attachment-icons',
                        bonusTitleAttr: 'title',
                        bonusDescAttr: null
                    },
                    bazaar: {
                        root: '#bazaarRoot',
                        itemsContainer: 'div[class*="itemsContainner"]',
                        tile: '[class*="item___"]',
                        imageWrapper: '[class*="imgBar___"]',
                        image: '[class*="imgContainer___"] img',
                        title: '[class*="description___"]',
                        stockElement: '[class*="amount___"]',
                        statsContainer: '[class*="infoBonuses___"]',
                        statEntry: '[class*="container___"]',
                        statIcon: 'i',
                        statValue: 'span',
                        statTypeElement: 'icon',
                        statTypeAttribute: 'className',
                        bonusIcons: '[class*="iconBonuses___"] i',
                        bonusTitleAttr: 'data-bonus-attachment-title',
                        bonusDescAttr: 'data-bonus-attachment-description'
                    }
                };

                // When new items are added, or if values are updated, these three sections will need to be adjusted.
                // The first number is the item ID. You can find that by searching the item name in the wiki.
                // https://wiki.torn.com/
                // For example, the item with ID 1 is the hammer, and the wiki shows that its base damage is 17
                // and its base accuracy is 55.
                // You can check for new items at tornstats by going to items and selecting the last page.
                // https://tornstats.com/items
                // You can cross reference them with the wiki. Please note, the wiki values are regularly wrong.
                // You may have to figure out the actual base values by looking for items on the market, and/or
                // doing some maths.
                const BASE_DAMAGE_VALUES = {
                    1: 17, 2: 16, 3: 20, 4: 11, 5: 21, 6: 25, 7: 28, 8: 34, 9: 40, 10: 61,
                    11: 58, 12: 28, 13: 29, 14: 32, 15: 36, 16: 44, 17: 48, 18: 52, 19: 55, 20: 59,
                    21: 64, 22: 41, 23: 39, 24: 45, 25: 48, 26: 56, 27: 55, 28: 59, 29: 61, 30: 64,
                    31: 67, 63: 72, 76: 52, 98: 59, 99: 33, 100: 64, 108: 65, 109: 77, 110: 27, 111: 39,
                    146: 65, 147: 22, 170: 60, 173: 24, 174: 50, 175: 1, 177: 61, 189: 42, 217: 57, 218: 35,
                    219: 63, 223: 69, 224: 23, 225: 56, 227: 38, 228: 50, 230: 18, 231: 60, 232: 62, 233: 61,
                    234: 31, 235: 22, 236: 35, 237: 62, 238: 29, 240: 78, 241: 50, 243: 30, 244: 15, 245: 13,
                    247: 52, 248: 62, 249: 46, 250: 50, 251: 53, 252: 49, 253: 27, 254: 47, 255: 67, 289: 70,
                    290: 70, 291: 70, 292: 70, 346: 40, 359: 16, 360: 53, 382: 75, 387: 67, 388: 74, 391: 57,
                    393: 14, 395: 61, 397: 71, 398: 69, 399: 68, 400: 63, 401: 26, 402: 51, 438: 18, 439: 19,
                    440: 1, 483: 42, 484: 46, 485: 40, 486: 38, 487: 39, 488: 37, 489: 35, 490: 46, 539: 36,
                    545: 79, 546: 76, 547: 78, 548: 77, 549: 80, 599: 60, 600: 61, 604: 43, 605: 45, 612: 65,
                    613: 47, 614: 60, 615: 64, 632: 48, 790: 5, 792: 17, 805: 18, 830: 95, 831: 54, 832: 21,
                    837: 66, 838: 63, 839: 60, 844: 15, 845: 58, 846: 56, 850: 58, 871: 5, 874: 68, 1053: 41,
                    1055: 35, 1056: 40, 1152: 76, 1153: 74, 1154: 73, 1155: 70, 1156: 68, 1157: 69, 1158: 62,
                    1159: 51, 1173: 37, 1231: 29, 1255: 54, 1257: 1, 1296: 27
                };

                const BASE_ACCURACY_VALUES = {
                    1: 55, 2: 57, 3: 52, 4: 62, 5: 45, 6: 55, 7: 60, 8: 52, 9: 58, 10: 23,
                    11: 52, 12: 53, 13: 52, 14: 56, 15: 54, 16: 58, 17: 51, 18: 49, 19: 38, 20: 36,
                    21: 30, 22: 63, 23: 65, 24: 51, 25: 51, 26: 52, 27: 47, 28: 55, 29: 47, 30: 45,
                    31: 41, 63: 28, 76: 24, 98: 24, 99: 57, 100: 24, 108: 43, 109: 39, 110: 52, 111: 51,
                    146: 49, 147: 15, 170: 24, 173: 55, 174: 56, 175: 54, 177: 53, 189: 54, 217: 49, 218: 63,
                    219: 55, 223: 52, 224: 52, 225: 62, 227: 48, 228: 48, 230: 22, 231: 46, 232: 50, 233: 55,
                    234: 52, 235: 59, 236: 55, 237: 56, 238: 52, 240: 25, 241: 57, 243: 57, 244: 39, 245: 55,
                    247: 55, 248: 53, 249: 47, 250: 53, 251: 51, 252: 62, 253: 41, 254: 52, 255: 39, 289: 54,
                    290: 54, 291: 54, 292: 54, 346: 63, 359: 50, 360: 57, 382: 62, 387: 63, 388: 45, 391: 65,
                    393: 54, 395: 60, 397: 28, 398: 50, 399: 57, 400: 35, 401: 33, 402: 60, 438: 42, 439: 43,
                    440: 63, 483: 52, 484: 41, 485: 54, 486: 45, 487: 43, 488: 41, 489: 48, 490: 24, 539: 55,
                    545: 38, 546: 47, 547: 46, 548: 45, 549: 36, 599: 48, 600: 41, 604: 45, 605: 48, 612: 52,
                    613: 63, 614: 62, 615: 52, 632: 48, 790: 29, 792: 57, 805: 55, 830: 45, 831: 53, 832: 54,
                    837: 36, 838: 60, 839: 45, 844: 45, 845: 53, 846: 52, 850: 50, 871: 59, 874: 57, 1053: 65,
                    1055: 49, 1056: 47, 1152: 42, 1153: 44, 1154: 40, 1155: 45, 1156: 36, 1157: 49, 1158: 39,
                    1159: 56, 1173: 67, 1231: 59, 1255: 52, 1257: 59, 1296: 58
                };

                const BASE_ARMOUR_VALUES = {
                    32: 20, 33: 32, 34: 34, 49: 31, 50: 36, 176: 23, 178: 30, 332: 38, 333: 40, 334: 42,
                    348: 10, 538: 25, 640: 32, 641: 34, 642: 30, 643: 30, 644: 34, 645: 30, 646: 24, 647: 20,
                    648: 20, 649: 20, 650: 20, 651: 38, 652: 38, 653: 38, 654: 38, 655: 35, 656: 45, 657: 45,
                    658: 45, 659: 45, 660: 44, 661: 44, 662: 44, 663: 44, 664: 44, 665: 46, 666: 46, 667: 46,
                    668: 46, 669: 46, 670: 49, 671: 49, 672: 49, 673: 49, 674: 49, 675: 40, 676: 52, 677: 52,
                    678: 52, 679: 52, 680: 55, 681: 55, 682: 55, 683: 55, 684: 55, 848: 32, 1164: 38, 1165: 50,
                    1166: 50, 1167: 50, 1168: 50, 1174: 39, 1307: 53, 1308: 53, 1309: 53, 1310: 53, 1311: 53,
                    1355: 48, 1356: 48, 1357: 48, 1358: 48, 1359: 48
                };

                // The following const is a map matching all item IDs to the damage, accuracy and armour values.
                // Weapons have damage and accuracy, armour just has armour. The script accounts for that by giving 0
                // to the missing values, so it won't have any effect on calculating bonus %. If some kind of wacky item
                // is added in the future which somehow has defensive and offensive stats, it could break this.
                const BASE_STATS_MAP = Object.keys({
                    ...BASE_DAMAGE_VALUES,
                    ...BASE_ACCURACY_VALUES,
                    ...BASE_ARMOUR_VALUES
                }).reduce((map, id) => {
                    map[id] = {
                        baseDamage: BASE_DAMAGE_VALUES[id] ?? 0,
                        baseAccuracy: BASE_ACCURACY_VALUES[id] ?? 0,
                        baseArmour: BASE_ARMOUR_VALUES[id] ?? 0
                    };
                    return map;
                }, {});

                // Some bonuses have a fixed effect without any varying number. These tend to be weapons
                // which were released before ranked war weapons were introduced.
                // They are currently sledgehammer, tranquilizer gun, and handbag.
                // Some may be missing, and some new things may need to be added here in future.
                const FIXED_BONUSES = ['Smash', 'Sleep', 'Storage'];

                const NUMBER_REGEX = /(\d+(?:\.\d+)?)/;

                const processedElements = new WeakSet();
                let darkMode = false;
                let currentHandler = null;

                // FUNCTIONS WHICH MAY NEED DEBUGGING ACCORDING TO GAME UDPDATES BELOW,
                // OR FUNCTIONS WHICH CAN BE ADJUSTED TO PREFERENCE

                // This checks the page source to see if it's in dark mode or not. This could changed/renamed.
                function checkDarkMode() {
                    darkMode = document.body.classList.contains('dark-mode');
                }

                // These percentages can be adjusted to change when quality is considered a higher "tier".
                function getTierColour(percent) {
                    const colours = darkMode ? COLOURS.tiers.dark : COLOURS.tiers.light;
                    if (percent <= 25) return colours[0];
                    if (percent <= 50) return colours[1];
                    if (percent <= 75) return colours[2];
                    return colours[3];
                }


                // Helper function for selecting a specific element from the DOM.
                function qs(selector, parent = document) {
                    try {
                        return parent.querySelector(selector);
                    } catch (e) {
                        return null;
                    }
                }

                // Helper function for selecting all instances of a specific element from the DOM.
                function qsa(selector, parent = document) {
                    try {
                        return Array.from(parent.querySelectorAll(selector));
                    } catch (e) {
                        return null;
                    }
                }

                // This is a generic helper function for creating DOM elements with children.
                // Search "create(" for examples of its usage.
                function create(tag, attrs = {}, children = []) {
                    const el = document.createElement(tag);
                    Object.entries(attrs).forEach(([key, value]) => {
                        if (key === 'style' && typeof value === 'object') {
                            Object.assign(el.style, value);
                        } else if (key === 'dataset' && typeof value === 'object') {
                            Object.entries(value).forEach(([k, v]) => el.dataset[k] = v);
                        } else {
                            el[key] = value;
                        }
                    });
                    children.forEach(child => {
                        if (typeof child === 'string') {
                            el.appendChild(document.createTextNode(child));
                        } else if (child) {
                            el.appendChild(child);
                        }
                    });
                    return el;
                }

                // processedElements is a set of elements which have been processed, for avoiding
                // duplicates. Necessary now since the script keeps a cache of items.
                function isProcessed(el) {
                    return processedElements.has(el);
                }

                function markProcessed(el) {
                    processedElements.add(el);
                }

                // This returns the "tier" for the item's quality, which will vary for weapons vs armour.
                // The maxRange is 100% for armour and 300% for weapons, unless they are adjusted.
                // The tier colour can also be adjusted, as well as which percent it falls under.
                function getQualityColour(value, maxRange) {
                    const percent = (value / maxRange) * 100;
                    return getTierColour(percent);
                }

                function getBonusColour() {
                    return darkMode ? COLOURS.bonus.dark : COLOURS.bonus.light;
                }

                // This is a global stat extraction function which works for the item market, bazaar
                // and auction house. This should be fairly future proof if the names of the HTML
                // elements change. You can just fix the SELECTORS at the top of the script.
                function extractStats(el, selectors) {
                    let damage = 0, accuracy = 0, armour = 0;

                    // Check if the container exists. If you're getting negative values
                    // for quality, the general structure of the item tile elements may have changed.
                    const container = qs(selectors.statsContainer, el);
                    if (!container) return { damage, accuracy, armour };

                    // This whole thing has to be a bit messy because there's no consistency across pages.
                    qsa(selectors.statEntry, container).forEach(entry => {
                        const valueEl = qs(selectors.statValue, entry);
                        const iconEl = qs(selectors.statIcon, entry);
                        const val = parseFloat(valueEl?.textContent) || 0;

                        const typeEl = selectors.statTypeElement === 'value' ? valueEl : iconEl;
                        let typeText = '';
                        if (selectors.statTypeAttribute === 'className') {
                            typeText = (typeEl?.className || '').toLowerCase();
                        } else {
                            typeText = (typeEl?.getAttribute(selectors.statTypeAttribute) || '').toLowerCase();
                        }

                        if (typeText.includes('damage')) damage = val;
                        else if (typeText.includes('accuracy')) accuracy = val;
                        // Sometimes the game calls it "armor" and sometimes it calls it "defence".
                        // They are not sure if they're American or British.
                        else if (typeText.includes('armor') || typeText.includes('defence')) armour = val;
                    });

                    return { damage, accuracy, armour };
                }

                // The auction house and bazaar store bonus information in the DOM, so we can
                // extract it with a shared function.
                function extractBonusesFromDOM(el, selectors) {
                    const bonuses = [];

                    qsa(selectors.bonusIcons, el).forEach(icon => {
                        // Auction house gets bonus name + percent from "title", bazaar gets it from
                        // title AND description. If one of these pages breaks but not the other,
                        // the elements might need to be changed in SELECTORS, or this function adjusted.
                        const titleAttr = icon.getAttribute(selectors.bonusTitleAttr) || '';
                        const descAttr = icon.getAttribute(selectors.bonusDescAttr) || '';
                        if (!titleAttr && !descAttr) return;

                        const tmp = create('div');
                        tmp.innerHTML = titleAttr;
                        const title = qs('b', tmp)?.textContent || tmp.textContent || '';
                        const descText = tmp.textContent.replace(title, '').trim() || descAttr;

                        const valueMatch = descText.match(NUMBER_REGEX);
                        const value = valueMatch ? parseFloat(valueMatch[1]) : null;

                        if (title) {
                            bonuses.push({ title, value, description: descText });
                        }
                    });

                    return bonuses;
                }

                // Each page tends to have wildly differing ways of storing the info,
                // but there are a few consistent aspects which can be grouped in this
                // function.
                function processItem(el, data) {
                    if (isProcessed(el)) return;

                    const { itemID, stats, bonuses, selectors } = data;

                    // Calculate quality.
                    const quality = calcQuality(itemID, stats.damage, stats.accuracy, stats.armour);
                    if (quality === null) return;

                    // Get title element for bonus insertion.
                    const titleEl = qs(selectors.title, el);
                    if (!titleEl) return;

                    // Remove existing bonus container if present.
                    const existing = qs('.openmarket-bonuses', el);
                    if (existing) existing.remove();

                    // Create bonus container.
                    const bonusContainer = create('div', {
                        className: 'openmarket-bonuses',
                        style: { lineHeight: '1' }
                    });

                    // Add bonus elements to container.
                    bonuses.forEach(bonus => {
                        bonusContainer.appendChild(createBonusEl(bonus));
                    });

                    // Insert bonus container.
                    if (bonusContainer.children.length > 0) {
                        if (data.insertBefore) {
                            titleEl.insertBefore(bonusContainer, data.insertBefore);
                        } else {
                            titleEl.appendChild(bonusContainer);
                        }
                    }

                    // Hide elements if specified.
                    (data.hideElements || []).forEach(hideEl => {
                        if (hideEl) hideEl.style.display = 'none';
                    });

                    // Insert quality box on image wrapper.
                    const imageWrapper = qs(selectors.imageWrapper, el);
                    const isArmour = stats.armour > 0;
                    insertQualityBox(imageWrapper, quality, isArmour ? 100 : 300);

                    markProcessed(el);
                }

                function getQualityBoxBg() {
                    return darkMode ? COLOURS.qualityBoxBg.dark : COLOURS.qualityBoxBg.light;
                }

                // Quality is not a value provided by the game.
                // So this needs to be calculated by using the damage/accuracy/armour values.
                // It's not perfectly accurate.
                // Perhaps in the future, proper quality values will be given, and this can be removed.
                function calcQuality(itemID, damage, accuracy, armour) {
                    const base = BASE_STATS_MAP[itemID];
                    if (!base) return null;

                    if (armour && armour !== 0) {
                        return ((armour - base.baseArmour) * 20).toFixed(1);
                    }
                    return (((damage - base.baseDamage) + (accuracy - base.baseAccuracy)) * 10).toFixed(1);
                }

                // A simple check to see if the value of the bonus has a percent after it
                // in the description. So it doesn't return something like "Disarm: 5%".
                // This could be expanded to include more info, like ' turns'.
                function getUnitFromDescription(description, value) {
                    if (!description || value === undefined || value === null) return '';
                    const pattern = new RegExp(String(value) + '\\s*%');
                    if (pattern.test(description)) return '%';
                    return '';
                }

                // This is a helper function which creates the small element holding the bonus info.
                // If the way item info is received changes, this could break. Also new unusual
                // items may potentially not be able to have their info extracted properly.
                function createBonusEl(bonus) {
                    const name = bonus.title || '';
                    const value = bonus.value;
                    const description = bonus.description || '';

                    // If this is a "fixed" bonus, just put the name there.
                    if (FIXED_BONUSES.includes(name)) {
                        return create('div', {
                            textContent: name,
                            style: { color: getBonusColour() }
                        });
                    }

                    let text = name;

                    // Use the getUnitFromDescription function to see if the description
                    // simply has a "%" after the number. That function was destined for
                    // bigger things...
                    if (value !== undefined && value !== null) {
                        const unit = getUnitFromDescription(description, value);
                        text = `${name}: ${value}${unit}`;
                    }

                    return create('div', {
                        textContent: text,
                        style: { color: getBonusColour() }
                    });
                }

                // Helper function for putting the quality element on the item image.
                function insertQualityBox(container, value, maxRange) {
                    if (!container || qs('.openmarket-quality-box', container)) return;

                    const colour = getQualityColour(parseFloat(value), maxRange);

                    // Child element containing the text.
                    const span = create('span', {
                        className: 'label-value t-overflow',
                        textContent: `Q ${value}%`
                    });

                    // This is the box/background. These numbers can be adjusted
                    // to change the styling. This could be removed entirely but
                    // it ensures the text is easy to read.
                    const box = create('div', {
                        className: 'openmarket-quality-box',
                        style: {
                            position: 'absolute',
                            top: '2px',
                            left: '2px',
                            padding: '1px 3px',
                            borderRadius: '3px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            zIndex: '2',
                            background: getQualityBoxBg(),
                            color: colour
                        }
                    }, [span]);

                    // I don't remember what problem this solved, perhaps a mobile/PDA thing.
                    const style = window.getComputedStyle(container);
                    if (style.position === 'static') {
                        container.style.position = 'relative';
                    }

                    container.appendChild(box);
                }

                // This is a simple check if the tab/window is in focus.
                // According to the rules, only a single tab can have its info used by a script.
                // !document.hidden checks if the current TAB is visible.
                // document.hasFocus() checks if the current WINDOW has focus.
                // From what I can tell, these both need to be included to abide by the rules.
                function isPageActive() {
                    return !document.hidden && document.hasFocus();
                }

                // This sets up listeners for tab visibility and window focus events,
                // runs processing when appropriate.
                function setupActiveListeners() {
                    const onActivate = () => {
                        if (currentHandler) {
                            currentHandler.processAll();
                        }
                    };

                    document.addEventListener('visibilitychange', onActivate);
                    window.addEventListener('focus', onActivate);
                }

                // ITEM MARKET

                const itemMarket = {
                    // When items are loaded on the item market, the script intercepts a fetch request
                    // which contains the info for the page to display them. It only contains info
                    // for newly added items, and since the market redraws everything, old item info
                    // needs to be kept in a cache. This was a recent change to Torn,
                    // and it could change again.
                    // NOTE: The legality of intercepting fetch requests for unviewed tabs was questioned.
                    // The Torn admin team deemed storing info in a cache is okay if it is not used in any
                    // way until the appropriate tab is viewed.
                    // Direct quote: "We agreed that it's fine to go ahead with your plan to keep it in cache,
                    // just as long as it's not persisted anywhere/repurposed for anything else"
                    // If you modify this script it is your responsibility to ensure this behaviour remains
                    // compliant, or there is a potential risk of account deletion.
                    cache: [],
                    selectors: SELECTORS.itemMarket,

                    // Check to see if the stats and price of an item matches what's listed in the cache.
                    // It's not impossible that items with identical stats and price with different bonuses
                    // could be mixed up. That seems like a very rare occurence, though.
                    matchToCache(el) {
                        // Convert the price into a plain integer. If processing isn't working on the item market
                        // only, the selectors could have changed.
                        const price = parseInt(qs(this.selectors.price, el)?.textContent.replace(/[^\d]/g, ''), 10) || 0;
                        const stats = extractStats(el, this.selectors);

                        return this.cache.find(item => {
                            if (item.armor && item.armor > 0) {
                                return item.minPrice === price && item.armor === stats.armour;
                            }
                            return item.minPrice === price && item.damage === stats.damage && item.accuracy === stats.accuracy;
                        });
                    },

                    processAll() {
                        // Per the rules, only process items if the page is currently visible AND in focus.
                        if (!isPageActive()) return;
                        if (this.cache.length === 0) return;

                        // Tile elements could have been changed by an update if item market isn't working.
                        qsa(this.selectors.tile).forEach(el => {
                            const cached = this.matchToCache(el);
                            if (!cached) return;

                            processItem(el, {
                                itemID: cached.itemID,
                                stats: {
                                    damage: cached.damage || 0,
                                    accuracy: cached.accuracy || 0,
                                    armour: cached.armor || 0
                                },
                                bonuses: cached.bonuses || [],
                                selectors: this.selectors
                            });
                        });
                    },

                    init() {
                        const root = qs(this.selectors.root);
                        if (!root) return;

                        // Scrolling the page loads in new items, so check for DOM changes and re-process.
                        const observer = new MutationObserver(() => {
                            this.processAll();
                        });

                        // Observe just the root element of the item market, to avoid excess reprocessing.
                        // This could probably be made more specific, as to not
                        // run when unnecessary (eg only reprocessing when the cache is updated).
                        observer.observe(root, { childList: true, subtree: true });
                        this.processAll();
                    }
                };

                // AUCTION HOUSE

                const auctionHouse = {
                    selectors: SELECTORS.auctionHouse,

                    processAll() {
                        if (!isPageActive()) return;

                        const visibleTab = qs(this.selectors.visibleTab);
                        if (!visibleTab) return;

                        qsa(this.selectors.tile, visibleTab).forEach(el => {

                            // If the auction house isn't working, it could be a selector in this section.
                            const hoverEl = qs(this.selectors.itemHover, el);

                            // If a specific item doesn't show up, it could be that the ID isn't in the map yet.
                            const itemID = hoverEl?.getAttribute('item');
                            if (!itemID || !BASE_STATS_MAP[itemID]) return;

                            // Or something went wrong with finding stats, and it returns 0 for all.
                            const stats = extractStats(el, this.selectors);
                            if (stats.damage === 0 && stats.accuracy === 0 && stats.armour === 0) return;

                            const titleEl = qs(this.selectors.title, el);
                            const rarityLine = qs(this.selectors.rarityLine, titleEl);

                            processItem(el, {
                                itemID,
                                stats,
                                bonuses: extractBonusesFromDOM(el, this.selectors),
                                selectors: this.selectors,
                                hideElements: [rarityLine] // Hide the rarity for tidiness.
                            });
                        });
                    },

                    init() {
                        // This function is the same as the item market, but instead of watching for vertical scrolls,
                        // this checks for going to a new page or switching to a different category.
                        // The observer is set off each time the counter ticks down,
                        // but it's only once a second, so whatever.
                        const root = qs(this.selectors.root);
                        if (!root) return;

                        const observer = new MutationObserver(() => {
                            this.processAll();
                        });

                        observer.observe(root, { childList: true, subtree: true });

                        this.processAll();
                    }
                };

                // BAZAAR

                const bazaar = {
                    selectors: SELECTORS.bazaar,

                    processAll() {
                        if (!isPageActive()) return;

                        qsa(this.selectors.tile).forEach(el => {
                            // Item ID is extracted from each item's image URL and filtered with regex.
                            const img = qs(this.selectors.image, el);
                            if (!img) return;

                            const match = img.src.match(/\/images\/items\/(\d+)\//);
                            if (!match) return;

                            const itemID = match[1];
                            if (!BASE_STATS_MAP[itemID]) return;

                            const stats = extractStats(el, this.selectors);
                            if (stats.damage === 0 && stats.accuracy === 0 && stats.armour === 0) return;

                            const titleEl = qs(this.selectors.title, el);
                            const stockEl = qs(this.selectors.stockElement, titleEl);

                            // For the bazaar, insert above the stock element, then hide stock for tidiness.
                            // There's no reason for Torn to tell us there's 1 in stock for these items anyway.
                            processItem(el, {
                                itemID,
                                stats,
                                bonuses: extractBonusesFromDOM(el, this.selectors),
                                selectors: this.selectors,
                                insertBefore: stockEl,
                                hideElements: [stockEl]
                            });
                        });
                    },

                    init() {
                        const root = qs(this.selectors.root);
                        if (!root) return;

                        // The outer observer waits for the bazaar in general to load, the inner observer
                        // then checks for changes due to scrolling, similar to the item market.
                        // One observer would probably work fine, but I think there was a reason for this
                        // at some point. Maybe the extra logic was related to a now fixed bazaar bug with
                        // large images.
                        const outerObserver = new MutationObserver((_, obs) => {
                            const container = qs(this.selectors.itemsContainer, root);
                            if (!container) return;

                            const innerObserver = new MutationObserver(() => {
                                this.processAll();
                            });

                            innerObserver.observe(container, { childList: true, subtree: true });
                            this.processAll();

                            obs.disconnect();
                        });

                        outerObserver.observe(root, { childList: true, subtree: true });
                    }
                };

                // FETCH REQUEST INTERCEPTION

                function interceptFetch() {
                    const originalFetch = window.fetch;

                    // Override the original fetch function to intercept requests.
                    window.fetch = async (...args) => {
                        const response = await originalFetch(...args);

                        // If the URL in the request shows it's related to the item market,
                        // add items to the cache, checking itemID for dupes.
                        // If the item market URL changes to no longer contain 'sid=iMarket',
                        // this could break. This could be adjusted to something more generic
                        // like 'market' to future-proof it, also could be added to SELECTORS.
                        const url = window.Request && args[0] instanceof window.Request ? args[0].url : String(args[0]);

                        if (url.includes('sid=iMarket')) {
                            response.clone().json().then(data => {
                                if (!data?.items?.length) return;

                                const existingIds = new Set(itemMarket.cache.map(i => i.listingID));
                                const newItems = data.items.filter(item => !existingIds.has(item.listingID));

                                if (newItems.length > 0) {
                                    itemMarket.cache.push(...newItems);
                                    if (isPageActive()) itemMarket.processAll();
                                }
                            }).catch(() => { });
                        }

                        return response;
                    };
                }

                // STYLES

                function insertStyles() {
                    const css = `
              [class*="itemTile___"] {
                  padding: 5px 3px 0 !important;
              }
              [class*="itemTile___"] [class*="title___"] {
                  padding: 5px 0 0px !important;
              }
              .openmarket-bonuses div {
                  font-size: 11px !important;
              }
          `;
                    const style = document.createElement('style');
                    style.textContent = css;
                    (document.head || document.documentElement).appendChild(style);
                }

                // INITIALISATION

                function init() {
                    // Insert the style changes and override the fetch function before the page loads.
                    insertStyles();
                    interceptFetch();

                    // Once the DOM is fully loaded, run the script.
                    document.addEventListener('DOMContentLoaded', () => {
                        checkDarkMode();
                        setupActiveListeners();

                        const href = window.location.href;

                        if (href.includes('sid=ItemMarket') && CONFIG.enableItemMarket) {
                            currentHandler = itemMarket;
                            itemMarket.init();
                        } else if (href.includes('amarket.php') && CONFIG.enableAuctionHouse) {
                            currentHandler = auctionHouse;
                            auctionHouse.init();
                        } else if (href.includes('bazaar.php') && CONFIG.enableBazaar) {
                            currentHandler = bazaar;
                            bazaar.init();
                        }
                        // Here, more pages can be added.
                        // TODO: Add various pages and simply match with https://www.torn.com/* since
                        // this checks the URL anyway. But URL check should be moved to the very first thing
                        // the script does.
                    });
                }

                init();
            })(pageWindow);
            pageWindow.__emuOpenMarketVersion = OPENMARKET_VERSION;
            state.openMarketLoaded = true;
            state.openMarketError = "";
        } catch (err) {
            state.openMarketLoaded = false;
            state.openMarketError = friendlyError(err);
        } finally {
            if (replayReady) document.addEventListener = nativeAddEventListener;
        }

        if (state.openMarketLoaded && readyListeners.length) {
            readyListeners.forEach(listener => Promise.resolve().then(() => {
                try {
                    listener.call(document, new Event("DOMContentLoaded"));
                } catch (err) {
                    state.openMarketError = friendlyError(err);
                }
            }));
        }
        return state.openMarketLoaded;
    }
    function scheduleCompanionVersionCheck() {
        if (state.updateCheckScheduled || state.updateCheckCompleted || state.updateCheckInFlight) return;
        state.updateCheckScheduled = true;
        window.setTimeout(() => {
            state.updateCheckScheduled = false;
            checkForCompanionUpdate();
        }, VERSION_CHECK_DELAY_MS);
    }

    async function checkForCompanionUpdate() {
        if (state.updateCheckCompleted || state.updateCheckInFlight || !document.body) return;
        state.updateCheckInFlight = true;
        state.updateCheckFailed = false;
        try {
            const manifest = await loadCompanionVersionManifest();
            const latest = String(manifest?.version || "").trim();
            state.latestCompanionVersion = latest;
            state.updateCheckCompleted = true;
            state.updateAvailableVersion = "";
            if (!latest || !isNewerCompanionVersion(latest, RUNTIME_VERSION)) return;
            state.updateAvailableVersion = latest;
            renderCompanionUpdateNotification(manifest);
        } catch (err) {
            // A failed update check must never affect Torn or normal Companion work.
            state.updateCheckCompleted = true;
            state.updateCheckFailed = true;
        } finally {
            state.updateCheckInFlight = false;
            if (state.panelBuilt && getValue(STORAGE.activeTab, "faction") === "settings" && !state.settingsEditing) renderPanel();
        }
    }

    async function loadCompanionVersionManifest() {
        const url = `${DASHBOARD_ORIGIN}/companion-version.json?v=${Date.now()}`;
        let text = "";
        if (typeof GM_xmlhttpRequest === "function") {
            try {
                text = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url,
                        responseType: "text",
                        timeout: 12000,
                        headers: { "Accept": "application/json" },
                        onload: response => {
                            const status = Number(response?.status || 0);
                            if (status >= 200 && status < 300) resolve(String(response?.responseText || response?.response || ""));
                            else reject(new Error(`HTTP ${status}`));
                        },
                        onerror: () => reject(new Error("network error")),
                        ontimeout: () => reject(new Error("timeout"))
                    });
                });
            } catch (err) {
                text = "";
            }
        }
        if (!text && typeof fetch === "function") {
            const response = await fetch(url, { cache: "no-store", credentials: "omit", mode: "cors" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            text = await response.text();
        }
        const manifest = JSON.parse(String(text || "{}"));
        return manifest && typeof manifest === "object" ? manifest : {};
    }

    function isNewerCompanionVersion(candidate, current) {
        const left = String(candidate || "").split(".").map(part => Number.parseInt(part, 10) || 0);
        const right = String(current || "").split(".").map(part => Number.parseInt(part, 10) || 0);
        const length = Math.max(left.length, right.length);
        for (let index = 0; index < length; index += 1) {
            const difference = Number(left[index] || 0) - Number(right[index] || 0);
            if (difference !== 0) return difference > 0;
        }
        return false;
    }

    function isTornPdaRuntime() {
        const pdaWindow = typeof unsafeWindow !== "undefined" && unsafeWindow ? unsafeWindow : window;
        return /TornPDA/i.test(String(navigator.userAgent || ""))
            || ["PDA_httpGet", "PDA_httpPost"].some(name => typeof pdaWindow?.[name] === "function");
    }

    function companionUpdateGuidance() {
        return isTornPdaRuntime()
            ? "TornPDA: open the Scripts section and update or reinstall the Companion there."
            : "Browser: press Update Script below.";
    }

    function openCompanionUpdate(download = "") {
        const rawUrl = String(download || `${DASHBOARD_ORIGIN}/emu-war-caller-pda.user.js`).trim();
        if (isTornPdaRuntime()) {
            showToast("TornPDA: open the Scripts section and update or reinstall the Companion there.");
            return false;
        }
        let url = rawUrl;
        try {
            const parsed = new URL(rawUrl, DASHBOARD_ORIGIN);
            parsed.searchParams.set("update", String(Date.now()));
            url = parsed.toString();
        } catch (err) { }
        // Updates are a normal browser navigation, not an attack action. Opening
        // them directly avoids userscript-manager tab helpers stalling the click.
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (opened) {
            try { opened.opener = null; } catch (err) { }
            return true;
        }
        window.location.assign(url);
        return false;
    }

    function renderCompanionUpdateNotification(manifest = {}) {
        const latest = String(state.updateAvailableVersion || manifest.version || "").trim();
        if (!latest || !document.body || document.getElementById("emu-caller-update-toast")) return;
        const download = String(manifest.download || `${DASHBOARD_ORIGIN}/emu-war-caller-pda.user.js`).trim();
        const host = ensureNotificationHost();
        const toast = document.createElement("div");
        toast.id = "emu-caller-update-toast";
        toast.className = "emu-caller-rally-toast emu-caller-update-toast";
        toast.innerHTML = `
      <strong>COMPANION UPDATE AVAILABLE</strong>
      <span>Version ${escapeHtml(latest)} is ready. You have ${escapeHtml(RUNTIME_VERSION)}.</span>
      <small>Update before your next war for the latest fixes.</small>
      <small class="emu-caller-update-guidance">${escapeHtml(companionUpdateGuidance())}</small>
      <div><button type="button" data-install-companion-update>Update Script</button><button type="button" data-dismiss-companion-update>Dismiss</button></div>
    `;
        toast.querySelector("[data-install-companion-update]")?.addEventListener("click", () => openCompanionUpdate(download));
        toast.querySelector("[data-dismiss-companion-update]")?.addEventListener("click", () => toast.remove());
        host.appendChild(toast);
    }

    function start() {
        if (enterFinishedWarSleep()) {
            configureCallerSurfacePolling(true);
            return;
        }
        resumeRuntime();
    }

    function onDashboardPage() {
        window.addEventListener(DASHBOARD_PINNED_TARGETS_EVENT, syncFavoriteTargetsFromDashboard);
        onReady(async () => {
            syncFavoriteTargetsFromDashboard();
            const key = String(
                localStorage.getItem("tornApiKeyOverride") ||
                localStorage.getItem("tornApiKey") ||
                ""
            ).trim();
            if (!isLikelyApiKey(key)) return;
            try {
                const auth = await validateApiKeyBeforeSave(key);
                storeValidatedApiKey(key, auth);
                setBool(STORAGE.enabled, true);
                showToast("EmuControl Companion key verified and synced. Refresh Torn after installing.");
            } catch (err) {
                showToast(`EmuControl Companion key was not changed: ${friendlyError(err)}`);
            }
        });
    }

    function normalizeFavoriteTargets(value) {
        const rows = Array.isArray(value) ? value : [];
        const seen = new Set();
        return rows.map(row => {
            const id = Number(row?.player_id ?? row?.playerId ?? row?.id ?? row?.target);
            if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return null;
            seen.add(id);
            return {
                id,
                player_id: id,
                name: String(row?.name || row?.player_name || `Player ${id}`).slice(0, 80),
                status: row?.status || "",
                statusState: String(row?.statusState || row?.status_state || "").slice(0, 40),
                statusUntil: Number(row?.statusUntil || row?.status_until || 0),
                pinned_at: Number(row?.pinned_at || 0)
            };
        }).filter(Boolean).slice(0, 100);
    }

    function syncFavoriteTargetsFromDashboard(event) {
        try {
            const parsed = JSON.parse(localStorage.getItem(DASHBOARD_PINNED_TARGETS_KEY) || "[]");
            const favorites = normalizeFavoriteTargets(parsed);
            setValue(STORAGE.favoriteTargets, JSON.stringify(favorites));
            const pageKey = String(
                localStorage.getItem("tornApiKeyOverride") ||
                localStorage.getItem("tornApiKey") ||
                ""
            ).trim();
            const pinChanged = event?.type === DASHBOARD_PINNED_TARGETS_EVENT;
            if (isLikelyApiKey(pageKey) && (favorites.length || pinChanged)) {
                apiRequest(
                    "/api/chain-pinned-targets",
                    { targets: favorites },
                    "POST",
                    pageKey
                ).then(data => {
                    const saved = normalizeFavoriteTargets(
                        Array.isArray(data?.targets) ? data.targets : favorites
                    );
                    state.favoriteTargets = saved;
                    state.favoriteTargetsLoadedAt = Date.now();
                    setValue(STORAGE.favoriteTargets, JSON.stringify(saved));
                }).catch(() => { });
            }
            return favorites;
        } catch (err) {
            return [];
        }
    }

    function onReady(callback) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback, { once: true });
        } else {
            callback();
        }
    }

    function isFinishedRankedWarReportUrl() {
        const href = String(location.href || "");
        if (!/\/war\.php/i.test(String(location.pathname || ""))) return false;
        try {
            const url = new URL(href);
            const step = String(url.searchParams.get("step") || "").toLowerCase();
            const sid = String(url.searchParams.get("sid") || "").toLowerCase();
            if (["rankreport", "rankedwarreport", "ranked-war-report"].includes(step)) return true;
            if (["rankreport", "rankedwarreport", "ranked-war-report"].includes(sid)) return true;
        } catch (err) { }
        return /(?:[?&#]|\b)(?:step|sid)=(?:rankreport|rankedwarreport|ranked-war-report)(?:[&#]|$)/i.test(href);
    }

    function isFinishedRankedWarReportPage() {
        if (isFinishedRankedWarReportUrl()) return true;
        // A live roster only overrides stale report-looking title/DOM remnants. An
        // explicit rank-report URL above is authoritative and must always sleep.
        if (hasLiveRankedWarRoster()) return false;
        if (Date.now() < Number(state.routeTransitionUntil || 0)) return false;
        if (!document.body || !/\/war\.php/i.test(String(location.pathname || ""))) return false;
        if (/\branked war report\b/i.test(String(document.title || ""))) return true;
        return Array.from(document.querySelectorAll("h1,h2,h3,h4,[class*='title'],[class*='header']"))
            .slice(0, 120)
            .some(node => /^ranked war report$/i.test(compactText(node)));
    }

    function hasLiveRankedWarRoster() {
        return Boolean(document.querySelector(".faction-war .members-list"));
    }

    function enterFinishedWarSleep() {
        if (state.sleeping) return true;
        if (!isFinishedRankedWarReportPage()) return false;
        state.sleeping = true;
        state.finishedReportHref = String(location.href || "");
        document.documentElement.setAttribute("data-emu-caller-sleeping", "finished-war");
        document.documentElement.removeAttribute("data-emu-caller-owns-war-table");
        clearTimeout(state.scanTimer);
        clearTimeout(state.pageDataTimer);
        clearTimeout(state.factionSwitchTimer);
        clearInterval(state.stateTimer);
        clearInterval(state.warStatusTimer);
        clearInterval(state.heartbeatTimer);
        state.stateTimer = 0;
        state.warStatusTimer = 0;
        state.heartbeatTimer = 0;
        state.mainObserver?.disconnect();
        state.mainObserver = null;
        state.warObservers.forEach(observer => observer.disconnect());
        state.warObservers.clear();
        state.targetRows.clear();
        state.pageDataDirty = false;
        state.panelBuilt = false;
        state.panelMarkup = "";
        state.panelMarkupTab = "";
        if (!state.sleepRouteTimer) {
            state.sleepRouteTimer = window.setInterval(() => {
                if (!state.sleeping) return;
                if (String(location.href || "") !== state.finishedReportHref || !isFinishedRankedWarReportPage()) {
                    handleRouteLifecycleChange();
                }
            }, 1000);
        }
        clearWarRowListing();
        clearForeignWarBspBadges();
        document.querySelectorAll("#emu-war-caller-root,#emu-war-caller-inline-slot,#emu-alliance-chat-root,#emu-family-chat-root,#emu-family-chat-native-tab,#emu-caller-attack-hint,#emu-caller-rally-toasts,#emu-caller-chain-watch,.emu-caller-chain-panel,[data-emu-chain-panel]").forEach(node => node.remove());
        state.inlineStatusCard = null;
        state.inlineSlot = null;
        state.inlineAnchorLookupAt = 0;
        return true;
    }

    function installRouteLifecycle() {
        if (state.routeLifecycleBound) return;
        state.routeLifecycleBound = true;
        const schedule = () => {
            state.routeLifecycleHref = String(location.href || "");
            scheduleRouteLifecycleCheck();
        };
        ["hashchange", "popstate"].forEach(type => window.addEventListener(type, schedule, { passive: true }));
        // Torn changes some SPA routes through history.replaceState without emitting an
        // event. Watching the URL is cheaper and safer than replacing Torn's global
        // history methods, which can interfere with its own navigation lifecycle.
        if (!state.routeLifecycleWatchTimer) {
            state.routeLifecycleWatchTimer = window.setInterval(() => {
                const href = String(location.href || "");
                if (href === state.routeLifecycleHref) return;
                state.routeLifecycleHref = href;
                scheduleRouteLifecycleCheck();
            }, ROUTE_WATCH_MS);
        }
    }

    function scheduleRouteLifecycleCheck() {
        if (isAttackPage() && (state.attackUiReady || state.attackHydrationScheduled)) return;
        clearTimeout(state.routeLifecycleTimer);
        state.routeLifecycleTimer = window.setTimeout(handleRouteLifecycleChange, 40);
    }

    function handleRouteLifecycleChange() {
        state.routeLifecycleTimer = 0;
        bootstrapOpenMarketModule();
        state.inlineStatusCard = null;
        state.inlineAnchorLookupAt = 0;
        state.factionChainRecentRoot = null;
        state.chainTargetLookupAt = 0;
        if (isFinishedRankedWarReportUrl()) {
            enterFinishedWarSleep();
            return;
        }
        if (state.sleeping) {
            // Torn can retain the old report DOM briefly after history changes. The URL is
            // authoritative during this short transition so the singleton can wake safely.
            state.routeTransitionUntil = Date.now() + 1500;
            resumeRuntime();
            [250, 900, 1700].forEach(delay => window.setTimeout(() => {
                if (!state.sleeping) scanSoon(0);
            }, delay));
            return;
        }
        if (enterFinishedWarSleep()) return;
        if (isAttackPage()) {
            const allianceChatRoot = document.getElementById("emu-alliance-chat-root");
            if (allianceChatRoot) allianceChatRoot.hidden = true;
            const familyChatRoot = document.getElementById("emu-family-chat-root");
            if (familyChatRoot) familyChatRoot.hidden = true;
            installAllianceAttackDataBridge();
            configureCallerSurfacePolling(false);
            if (!state.attackUiReady) scheduleAttackSupportHydration();
            return;
        }
        stopAttackResultObserver();
        state.attackUiReady = false;
        installPageDataBridge();
        updateWarTableOwnershipMarker();
        if (!document.getElementById("emu-war-caller-root")) buildPanel();
        startLoops();
        configureCallerSurfacePolling(true);
        renderPanel();
        scanSoon(120);
        startProfileBspBootstrap();
        startCompanyBspBootstrap();
        startHallOfFameBspBootstrap();
        bindHallOfFameNavigationRefresh();
        startAdvancedSearchBspBootstrap();
        bindAdvancedSearchNavigationRefresh();
    }

    function resumeRuntime() {
        if (!document.body) {
            onReady(resumeRuntime);
            return;
        }
        if (isFinishedRankedWarReportUrl()) {
            enterFinishedWarSleep();
            return;
        }
        state.sleeping = false;
        state.finishedReportHref = "";
        clearInterval(state.sleepRouteTimer);
        state.sleepRouteTimer = 0;
        document.documentElement.removeAttribute("data-emu-caller-sleeping");
        document.getElementById("emu-caller-hof-diagnostic")?.remove();
        if (isAttackPage()) {
            // Fight speed is more important than dashboard decoration. Result capture is
            // already installed at document-start; hydrate the optional fight UI only
            // after Torn has finished loading its own combat runtime.
            installAllianceAttackDataBridge();
            scheduleAttackSupportHydration();
            return;
        }
        if (!state.initialized) {
            addStyles();
            loadPersistentCaches();
            loadCachedState();
            registerMenus();
            bindWarTableDelegation();
            installPageDataBridge();
            state.initialized = true;
        }
        scheduleCompanionVersionCheck();
        updateWarTableOwnershipMarker();
        buildPanel();
        void syncFavoriteTargetsFromServer();
        startLoops();
        scanSoon(0);
        [80, 240].forEach(delay => window.setTimeout(() => scanSoon(0), delay));
    }

    function scheduleAttackSupportHydration() {
        if (state.attackHydrationScheduled) return;
        state.attackHydrationScheduled = true;
        const hydrate = () => window.setTimeout(() => {
            state.attackHydrationScheduled = false;
            if (!isAttackPage()) {
                handleRouteLifecycleChange();
                return;
            }
            addStyles();
            if (!state.initialized) {
                loadCachedState();
                registerMenus();
            }
            state.attackUiReady = true;
            configureCallerSurfacePolling(true);
            renderAttackPageHint();
            renderAllianceAttackWarning();
            startAttackResultObserver();
        }, 1200);
        if (document.readyState === "complete") hydrate();
        else window.addEventListener("load", hydrate, { once: true });
    }

    function startAttackResultObserver() {
        if (!isAttackPage() || state.attackResultObserver) return;
        const root = document.querySelector("main,#mainContainer,#mainroot") || document.body;
        if (!(root instanceof Node)) return;
        state.attackResultObserver = new MutationObserver(() => {
            if (!isAttackPage()) return;
            clearTimeout(state.attackResultTimer);
            state.attackResultTimer = window.setTimeout(() => {
                state.attackResultTimer = 0;
                if (isAttackPage()) {
                    maybeLogFightFinished("dom-observer", null);
                    renderAllianceAttackWarning();
                }
            }, 350);
        });
        state.attackResultObserver.observe(root, { childList: true, characterData: true, subtree: true });
    }

    function stopAttackResultObserver() {
        state.attackResultObserver?.disconnect();
        state.attackResultObserver = null;
        clearTimeout(state.attackResultTimer);
        state.attackResultTimer = 0;
    }

    function installAllianceAttackDataBridge() {
        if (!isAttackPage()) return;
        const rootWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        if (!rootWindow || rootWindow.__emuCallerAllianceAttackBridgeInstalled) return;
        rootWindow.__emuCallerAllianceAttackBridgeInstalled = true;
        const isAttackDataUrl = url => /(?:[?&]sid=attackData\b|\/attackData\b)/i.test(String(url || ""));
        const emit = (url, payload) => {
            try {
                window.postMessage({ source: "emu-caller-alliance-attack-data", url: String(url || ""), payload }, "*");
            } catch (err) {
                // Alliance attack protection is best-effort if the page sandbox blocks messaging.
            }
        };

        try {
            const nativeFetch = rootWindow.fetch;
            if (typeof nativeFetch === "function") {
                rootWindow.fetch = function emuCallerAllianceAttackFetch(input, init) {
                    const url = typeof input === "string" ? input : input?.url;
                    const request = nativeFetch.apply(this, arguments);
                    if (!isAttackDataUrl(url)) return request;
                    return request.then(response => {
                        try {
                            response.clone().json().then(data => emit(url, data)).catch(() => { });
                        } catch (err) { }
                        return response;
                    });
                };
            }
        } catch (err) {
            // Some mobile userscript engines do not allow patching fetch.
        }

        try {
            const xhrProto = rootWindow.XMLHttpRequest && rootWindow.XMLHttpRequest.prototype;
            if (xhrProto && !xhrProto.__emuCallerAllianceAttackPatched) {
                xhrProto.__emuCallerAllianceAttackPatched = true;
                const nativeOpen = xhrProto.open;
                const nativeSend = xhrProto.send;
                xhrProto.open = function emuCallerAllianceAttackOpen(method, url) {
                    this.__emuCallerAllianceAttackUrl = url;
                    return nativeOpen.apply(this, arguments);
                };
                xhrProto.send = function emuCallerAllianceAttackSend() {
                    if (isAttackDataUrl(this.__emuCallerAllianceAttackUrl)) {
                        this.addEventListener("load", function () {
                            try {
                                emit(this.__emuCallerAllianceAttackUrl, JSON.parse(this.responseText));
                            } catch (err) { }
                        });
                    }
                    return nativeSend.apply(this, arguments);
                };
            }
        } catch (err) {
            // Optional.
        }

        window.addEventListener("message", event => {
            if (event?.data?.source !== "emu-caller-alliance-attack-data") return;
            rememberAllianceAttackData(event.data.payload);
        });
    }

    function rememberAllianceAttackData(payload) {
        if (!payload || typeof payload !== "object") return;
        const root = payload?.DB?.defenderUser
            ? payload
            : payload?.data?.DB?.defenderUser
                ? payload.data
                : payload?.response?.DB?.defenderUser
                    ? payload.response
                    : null;
        const defender = root?.DB?.defenderUser;
        if (!defender || typeof defender !== "object") return;
        const nextFactionId = Number(defender.factionID ?? defender.factionId ?? defender.faction_id ?? 0) || 0;
        const previousKey = allianceAttackWarningKey();
        state.pageData.attackData = root;
        state.attackAllianceFactionId = nextFactionId;
        state.attackAllianceViewStyle = String(root.viewStyle || "");
        const nextKey = allianceAttackWarningKey();
        if (previousKey && nextKey && previousKey !== nextKey) state.attackAllianceOverrideKey = "";
        renderAllianceAttackWarning();
    }

    function shouldInstallPageDataBridge() {
        if (isAttackPage()) return false;
        if (isFinishedRankedWarReportUrl()) return false;
        const path = String(location.pathname || "").toLowerCase();
        let route = String(location.hash || "").toLowerCase();
        try { route = decodeURIComponent(route); } catch (err) { }
        return /\/war\.php$/.test(path)
            || (/\/factions\.php$/.test(path) && /\/war\/(?:rank|war)(?:[/?#]|$)/.test(route))
            || isHallOfFameBspPage()
            || isAdvancedSearchRoute();
    }

    function installPageDataBridge() {
        if (!shouldInstallPageDataBridge()) return;
        const rootWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        if (!rootWindow || rootWindow.__emuWarCallerBridgeInstalled) return;
        rootWindow.__emuWarCallerBridgeInstalled = true;

        const interestingUrl = url => !isAttackPage() && (
            PAGE_DATA_ENDPOINT_PATTERN.test(String(url || ""))
            || (isHallOfFameBspPage() && !/chat\/online-status/i.test(String(url || "")))
            || (isAdvancedSearchRoute() && !/chat\/online-status/i.test(String(url || "")))
        );
        const emit = (kind, url, payload) => {
            try {
                window.postMessage({ source: "emu-war-caller-page-data", kind, url: String(url || ""), payload }, "*");
            } catch (err) {
                // Read-only page-data interception is optional.
            }
        };

        try {
            const nativeFetch = rootWindow.fetch;
            if (typeof nativeFetch === "function") {
                rootWindow.fetch = function emuCallerFetch(input, init) {
                    const url = typeof input === "string" ? input : input?.url;
                    const request = nativeFetch.apply(this, arguments);
                    if (!interestingUrl(url)) return request;
                    return request.then(response => {
                        try {
                            response.clone().json().then(data => emit("fetch", url, data)).catch(() => { });
                        } catch (err) {
                            // Ignore cloned response failures.
                        }
                        return response;
                    });
                };
            }
        } catch (err) {
            // Some mobile script engines do not allow patching fetch.
        }

        try {
            const xhrProto = rootWindow.XMLHttpRequest && rootWindow.XMLHttpRequest.prototype;
            if (xhrProto && !xhrProto.__emuWarCallerPatched) {
                xhrProto.__emuWarCallerPatched = true;
                const nativeOpen = xhrProto.open;
                const nativeSend = xhrProto.send;
                xhrProto.open = function emuCallerOpen(method, url) {
                    this.__emuCallerUrl = url;
                    return nativeOpen.apply(this, arguments);
                };
                xhrProto.send = function emuCallerSend() {
                    if (interestingUrl(this.__emuCallerUrl)) {
                        this.addEventListener("load", function () {
                            const url = this.__emuCallerUrl;
                            try {
                                emit("xhr", url, JSON.parse(this.responseText));
                            } catch (err) { }
                        });
                    }
                    return nativeSend.apply(this, arguments);
                };
            }
        } catch (err) {
            // Optional.
        }

        // Do not replace Torn's global WebSocket constructor. Live hospital, travel,
        // online and med-out state already comes from the dedicated war-status feed,
        // while Torn's own DOM mutations keep the native roster current.

        window.addEventListener("message", event => {
            if (event?.data?.source !== "emu-war-caller-page-data") return;
            if (isAttackPage()) return;
            rememberPageData(event.data.url, event.data.payload);
        });
    }

    function parseSocketPayload(data) {
        const path = String(location.pathname || "");
        const route = String(location.hash || "");
        if (!/\/war\.php$/i.test(path) && !(/\/factions\.php$/i.test(path) && /\/war\/rank/i.test(route))) return null;
        if (typeof data !== "string" || !/updateStatus|status/i.test(data)) return null;
        try {
            return JSON.parse(data);
        } catch (err) {
            return { raw: data.slice(0, 4000) };
        }
    }

    function rememberPageData(url, payload) {
        if (state.sleeping || enterFinishedWarSleep()) return;
        if (!payload) return;
        const text = String(url || "");
        const hallOfFamePage = isHallOfFameBspPage();
        const advancedSearchPage = isAdvancedSearchRoute();
        if (!PAGE_DATA_ENDPOINT_PATTERN.test(text) && !/updateStatus|websocket/i.test(text) && !hallOfFamePage && !advancedSearchPage) return;
        if (/chat\/online-status|updateStatus|websocket/i.test(text) && !isOwnWarPage()) return;
        if (/getwarusers|warusers|getwardata|getProcessBarRefreshData|factionsRankedWarProcessBarRefresh/i.test(text) && !isOwnWarPage()) return;
        let affectsRows = false;
        if (/getwarusers|warusers/i.test(text)) {
            state.pageData.warUsers = payload;
            affectsRows = true;
        } else if (/getwardata/i.test(text)) {
            state.pageData.warData = payload;
            affectsRows = true;
        } else if (/getProcessBarRefreshData|factionsRankedWarProcessBarRefresh/i.test(text)) {
            state.pageData.processBar = payload;
            return;
        } else if (/chat\/online-status/i.test(text)) {
            state.pageData.onlineStatus = payload;
            affectsRows = true;
        } else if (/attackData/i.test(text)) {
            state.pageData.attackData = payload;
            if (getBool(STORAGE.enabled, true)) {
                maybeLogFightFinished("page-data", payload);
                renderAttackPageHint();
            }
            return;
        } else if (/updateStatus|websocket/i.test(text)) {
            state.pageData.statusFeed = payload;
            affectsRows = true;
        } else if (hallOfFamePage) {
            const hallOfFameRecords = hallOfFamePayloadRecords(payload);
            if (!hallOfFameRecords.length) return;
            const responses = Array.isArray(state.pageData.hallOfFame) ? state.pageData.hallOfFame : [];
            responses.push({ url: text, payload, records: hallOfFameRecords });
            state.pageData.hallOfFame = responses.slice(-12);
            state.hallOfFameTransientRecords = hallOfFameRecords;
            state.hallOfFameRecordSource = compactText(text || "captured Hall of Fame JSON").slice(0, 160);
            refreshEmuBspStats(hallOfFameRecords.map(record => ({ id: record.id, row: null })), false).catch(() => { });
            scheduleHallOfFameRefreshBurst();
            return;
        } else if (advancedSearchPage) {
            const advancedRecords = advancedSearchPayloadRecords(payload);
            if (!advancedRecords.length) return;
            clearAdvancedSearchBspMounts();
            const responses = Array.isArray(state.pageData.advancedSearch) ? state.pageData.advancedSearch : [];
            responses.push({ url: text, payload });
            state.pageData.advancedSearch = responses.slice(-12);
            state.advancedSearchPayloadRevision += 1;
            state.advancedSearchAwaitingPayload = false;
            refreshEmuBspStats(advancedRecords.map(record => ({ id: record.id, row: null })), false).catch(() => { });
            scheduleAdvancedSearchRefreshBurst();
            return;
        }
        if (!affectsRows) return;
        state.pageDataDirty = true;
        clearTimeout(state.pageDataTimer);
        const elapsed = Date.now() - state.lastPageDataScanAt;
        const delay = Math.max(PAGE_DATA_DEBOUNCE_MS, PAGE_DATA_ROW_REFRESH_MS - elapsed);
        state.pageDataTimer = setTimeout(() => {
            state.lastPageDataScanAt = Date.now();
            if (state.pageDataDirty) rebuildTargetMetaIndex();
            state.pageDataDirty = false;
            if (getBool(STORAGE.panelOpen, false)) renderPanel();
            refreshMountedWarRowsOrScan();
        }, delay);
    }

    function refreshMountedWarRowsOrScan() {
        if (!isOwnWarPage() || !state.warListingMounted) {
            scanWarRows();
            return;
        }
        const mountedRows = Array.from(document.querySelectorAll(".faction-war .members-list [data-emu-caller-native-row='true']"));
        const targets = collectTargetRows();
        const missingEnhancement = !mountedRows.length
            || mountedRows.some(row =>
                !row.querySelector(":scope > .emu-caller-bsp-cell")
                || (row.getAttribute("data-emu-caller-native-side") === "own" && !row.querySelector(":scope > .emu-caller-native-cd"))
            )
            || targets.some(target => !target.row.querySelector(`.emu-caller-row-tools[data-emu-caller-target="${Number(target.id)}"]`));
        if (missingEnhancement) {
            scanWarRows();
            return;
        }
        state.targetRows = new Map(targets.map(target => [Number(target.id), target]));
        refreshMountedStatusTimers();
        applyCallMarkers(targets);
    }

    function registerMenus() {
        try {
            GM_registerMenuCommand("EmuControl Companion", () => {
                setBool(STORAGE.panelOpen, true);
                setBool(STORAGE.universalCollapsed, false);
                renderPanel();
            });
        } catch (err) {
            // TornPDA menu support varies.
        }
    }

    function scrollAllianceChatToLatest() {
        const list = document.querySelector("#emu-alliance-chat-root .emu-alliance-chat-messages");
        if (!(list instanceof HTMLElement) || !getBool(STORAGE.allianceChatOpen, false)) return;
        const jumpToUnread = Boolean(state.allianceChatUnreadJumpPending && state.allianceChatNewBoundaryId);
        state.allianceChatUnreadJumpPending = false;
        const scrollLatest = () => {
            if (!getBool(STORAGE.allianceChatOpen, false) || !list.isConnected) return;
            const divider = jumpToUnread ? list.querySelector(".emu-alliance-chat-new-divider") : null;
            if (divider instanceof HTMLElement) {
                const listRect = list.getBoundingClientRect();
                const dividerRect = divider.getBoundingClientRect();
                list.scrollTop = Math.max(0, list.scrollTop + dividerRect.top - listRect.top - 6);
                return;
            }
            list.scrollTop = list.scrollHeight;
        };
        window.requestAnimationFrame(scrollLatest);
        window.setTimeout(scrollLatest, 60);
        window.setTimeout(scrollLatest, 180);
    }

    function chatRowsAfterSeen(rows, seenAt = 0, seenId = "") {
        const messages = Array.isArray(rows) ? rows : [];
        const normalizedSeenId = String(seenId || "");
        if (normalizedSeenId) {
            const seenIndex = messages.findIndex(row => String(row?.id || "") === normalizedSeenId);
            if (seenIndex >= 0) return messages.slice(seenIndex + 1);
        }
        const normalizedSeenAt = Number(seenAt || 0);
        return normalizedSeenAt > 0
            ? messages.filter(row => Number(row?.created_at || 0) > normalizedSeenAt)
            : [];
    }

    function captureAllianceChatUnreadBoundary() {
        state.allianceChatOpenSeenAt = Number(getValue(STORAGE.allianceChatSeenAt, 0) || 0);
        state.allianceChatOpenSeenId = String(getValue(STORAGE.allianceChatSeenId, "") || "");
        const unseen = chatRowsAfterSeen(
            state.allianceChatMessages,
            state.allianceChatOpenSeenAt,
            state.allianceChatOpenSeenId
        );
        const ownerId = Number(state.owner?.id || 0);
        state.allianceChatNewBoundaryId = unseen.some(row => Number(row?.senderId || 0) !== ownerId)
            ? String(unseen[0]?.id || "")
            : "";
        state.allianceChatUnreadJumpPending = Boolean(state.allianceChatNewBoundaryId);
        state.allianceChatAwaitingOpenSync = true;
    }

    function setAllianceChatInputArmed(input, armed) {
        if (!(input instanceof HTMLInputElement)) return;
        const enabled = Boolean(armed);
        input.dataset.emuChatInputArmed = enabled ? "true" : "false";
        input.readOnly = !enabled;
        input.setAttribute("inputmode", enabled ? "text" : "none");
        if (!enabled && document.activeElement === input) input.blur();
    }

    function pasteIntoAllianceChatInput(input, event) {
        if (!(input instanceof HTMLInputElement)) return;
        setAllianceChatInputArmed(input, true);
        const transfer = event?.clipboardData || event?.dataTransfer;
        let pasted = String(transfer?.getData?.("text/plain") || transfer?.getData?.("text/uri-list") || "").trim();
        if (!pasted) {
            const html = String(transfer?.getData?.("text/html") || "");
            if (html) {
                try {
                    const clipboardDocument = new DOMParser().parseFromString(html, "text/html");
                    pasted = String(
                        clipboardDocument.querySelector("img[src]")?.getAttribute("src")
                        || clipboardDocument.querySelector("a[href]")?.getAttribute("href")
                        || ""
                    ).trim();
                } catch (err) {
                    pasted = "";
                }
            }
        }
        if (!pasted || /^data:/i.test(pasted)) return;
        event.preventDefault();
        const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
        const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
        const available = Math.max(0, ALLIANCE_CHAT_MAX_LENGTH - (input.value.length - (end - start)));
        input.setRangeText(pasted.slice(0, available), start, end, "end");
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function normalizeAllianceChatGifUrl(value) {
        const raw = String(value || "").trim().slice(0, ALLIANCE_CHAT_GIF_MAX_LENGTH);
        if (!raw) return "";
        try {
            const url = new URL(raw);
            const host = String(url.hostname || "").toLowerCase();
            const uploadedMedia = (host === "emucontrol.emufam.com" || host === "nameless.emufam.com")
                && /^\/api\/emu-caller\/alliance-chat\/media\/[a-f0-9]{32}\.(?:gif|webp|png|jpg)$/i.test(url.pathname);
            const trustedExternal = host === "i.imgur.com"
                || host === "cdn.discordapp.com"
                || host === "media.discordapp.net"
                || host.endsWith(".giphy.com")
                || host.endsWith(".tenor.com");
            if (url.protocol !== "https:" || (!uploadedMedia && (!trustedExternal || !/\.(?:gif|webp)$/i.test(url.pathname)))) return "";
            url.hash = "";
            return url.href.slice(0, ALLIANCE_CHAT_GIF_MAX_LENGTH);
        } catch (err) {
            return "";
        }
    }

    function chatMessageMentionsPlayer(message, playerName) {
        const wanted = String(playerName || "").trim().toLowerCase();
        if (!wanted) return false;
        const pattern = /(^|[^A-Za-z0-9_-])@([A-Za-z0-9_-]{1,80})/g;
        let match;
        while ((match = pattern.exec(String(message || ""))) !== null) {
            if (String(match[2] || "").toLowerCase() === wanted) return true;
        }
        return false;
    }

    function renderChatMessageHtml(message, playerName) {
        const raw = String(message || "");
        const wanted = String(playerName || "").trim().toLowerCase();
        const tokenPattern = /https:\/\/[^\s<>"']+|@[A-Za-z0-9_-]{1,80}/gi;
        let html = "";
        let cursor = 0;
        let match;
        while ((match = tokenPattern.exec(raw)) !== null) {
            const index = Number(match.index || 0);
            const token = String(match[0] || "");
            html += escapeHtml(raw.slice(cursor, index));
            if (/^https:\/\//i.test(token)) {
                let urlText = token;
                let trailing = "";
                while (/[.,!?;:]$/.test(urlText)) {
                    trailing = urlText.slice(-1) + trailing;
                    urlText = urlText.slice(0, -1);
                }
                try {
                    const url = new URL(urlText);
                    if (url.protocol === "https:") {
                        html += `<a class="emu-alliance-chat-link" href="${escapeAttr(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(urlText)}</a>${escapeHtml(trailing)}`;
                    } else {
                        html += escapeHtml(token);
                    }
                } catch (err) {
                    html += escapeHtml(token);
                }
            } else {
                const previous = index > 0 ? raw[index - 1] : "";
                const name = token.slice(1);
                if (previous && /[A-Za-z0-9_-]/.test(previous)) {
                    html += escapeHtml(token);
                } else {
                    const mine = wanted && name.toLowerCase() === wanted;
                    html += `<mark class="emu-alliance-chat-mention${mine ? " is-you" : ""}">@${escapeHtml(name)}</mark>`;
                }
            }
            cursor = index + token.length;
        }
        return html + escapeHtml(raw.slice(cursor));
    }

    function chatMentionUsersForRoot(root) {
        return root?.id === "emu-family-chat-root"
            ? state.familyChatMentionUsers
            : state.allianceChatMentionUsers;
    }

    function currentChatMentionToken(input) {
        if (!(input instanceof HTMLInputElement)) return null;
        const caret = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
        const before = input.value.slice(0, caret);
        const match = /@([A-Za-z0-9_-]*)$/.exec(before);
        if (!match) return null;
        const start = caret - match[0].length;
        if (start > 0 && /[A-Za-z0-9_-]/.test(input.value[start - 1])) return null;
        return { start, end: caret, query: String(match[1] || "").toLowerCase() };
    }

    function hideChatMentionSuggestions(root) {
        const list = root?.querySelector?.(".emu-alliance-chat-suggestions");
        if (!(list instanceof HTMLElement)) return;
        list.hidden = true;
        list.innerHTML = "";
        list.dataset.activeIndex = "0";
    }

    function chooseChatMentionSuggestion(root, input, name) {
        const token = currentChatMentionToken(input);
        const safeName = String(name || "").trim();
        if (!token || !safeName) return;
        input.setRangeText(`@${safeName} `, token.start, token.end, "end");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        hideChatMentionSuggestions(root);
        input.focus({ preventScroll: true });
    }

    function renderChatMentionSuggestions(root, input) {
        const list = root?.querySelector?.(".emu-alliance-chat-suggestions");
        const token = currentChatMentionToken(input);
        if (!(list instanceof HTMLElement) || !token || input?.dataset?.emuChatInputArmed !== "true") {
            hideChatMentionSuggestions(root);
            return;
        }
        const users = Array.isArray(chatMentionUsersForRoot(root)) ? chatMentionUsersForRoot(root) : [];
        const candidates = users
            .filter(row => String(row?.name || "").toLowerCase().startsWith(token.query))
            .slice(0, 8);
        if (!candidates.length) {
            hideChatMentionSuggestions(root);
            return;
        }
        list.innerHTML = candidates.map((row, index) => {
            const name = String(row?.name || "").slice(0, 80);
            const tag = String(row?.factionTag || "FAC").slice(0, 16);
            return `<button type="button" role="option" class="emu-alliance-chat-suggestion${index === 0 ? " is-active" : ""}" data-mention-name="${escapeAttr(name)}"><span>${escapeHtml(name)}</span><small>[${escapeHtml(tag)}]</small></button>`;
        }).join("");
        list.dataset.activeIndex = "0";
        list.hidden = false;
    }

    function bindChatMentionAutocomplete(root, input) {
        if (!(root instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return;
        const list = root.querySelector(".emu-alliance-chat-suggestions");
        input.addEventListener("input", () => renderChatMentionSuggestions(root, input));
        input.addEventListener("click", () => renderChatMentionSuggestions(root, input));
        input.addEventListener("keydown", event => {
            if (!(list instanceof HTMLElement) || list.hidden) return;
            const buttons = Array.from(list.querySelectorAll(".emu-alliance-chat-suggestion"));
            if (!buttons.length) return;
            let active = Math.max(0, Math.min(buttons.length - 1, Number(list.dataset.activeIndex || 0)));
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                active = (active + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
                list.dataset.activeIndex = String(active);
                buttons.forEach((button, index) => button.classList.toggle("is-active", index === active));
            } else if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                chooseChatMentionSuggestion(root, input, buttons[active]?.dataset?.mentionName || "");
            } else if (event.key === "Escape") {
                event.preventDefault();
                hideChatMentionSuggestions(root);
            }
        });
        list?.addEventListener("mousedown", event => event.preventDefault());
        list?.addEventListener("click", event => {
            const button = event.target?.closest?.(".emu-alliance-chat-suggestion");
            if (!(button instanceof HTMLButtonElement)) return;
            chooseChatMentionSuggestion(root, input, button.dataset.mentionName || "");
        });
        input.addEventListener("blur", () => window.setTimeout(() => hideChatMentionSuggestions(root), 140));
    }

    function showChatMentionNotification(room, row) {
        const messageId = String(row?.id || "");
        const noticeId = `${room}:${messageId}`;
        if (!messageId || state.chatMentionNotifiedIds.has(noticeId) || !document.body) return;
        state.chatMentionNotifiedIds.add(noticeId);
        if (state.chatMentionNotifiedIds.size > 120) {
            state.chatMentionNotifiedIds = new Set(Array.from(state.chatMentionNotifiedIds).slice(-80));
        }
        const senderName = String(row?.senderName || "A player").slice(0, 80);
        const factionTag = String(row?.factionTag || (room === "family" ? "EMU" : "FAC")).slice(0, 16);
        const snippet = String(row?.message || "").trim().slice(0, 150);
        const host = ensureNotificationHost();
        const toast = document.createElement("div");
        toast.className = `emu-caller-rally-toast emu-caller-chat-mention-toast ${room === "family" ? "scope-faction" : "scope-alliance"}`;
        toast.dataset.emuCallerChatMentionId = noticeId;
        toast.innerHTML = `
      <div class="emu-caller-toast-drag-handle" title="Drag notifications">&#8942;&#8942; Drag notifications</div>
      <strong>${escapeHtml(`[${factionTag}] ${senderName} mentioned you`)}</strong>
      ${snippet ? `<span>${renderChatMessageHtml(snippet, state.owner?.name || "")}</span>` : ""}
      <div><button type="button" data-open-chat-mention>Open chat</button><button type="button" data-dismiss-chat-mention>Dismiss</button></div>
    `;
        toast.querySelector("[data-open-chat-mention]")?.addEventListener("click", () => {
            if (room === "family" && typeof toggleFamilyChat === "function") toggleFamilyChat(true);
            else toggleAllianceChat(true);
            toast.remove();
        });
        toast.querySelector("[data-dismiss-chat-mention]")?.addEventListener("click", () => toast.remove());
        host.appendChild(toast);
        window.setTimeout(() => toast.remove(), 30000);
    }

    function normalizeAllianceChatGifSubmissionUrl(value) {
        const raw = String(value || "").trim().slice(0, ALLIANCE_CHAT_GIF_MAX_LENGTH);
        if (!raw) return "";
        const direct = normalizeAllianceChatGifUrl(raw);
        if (direct) return direct;
        try {
            const url = new URL(raw);
            const host = String(url.hostname || "").toLowerCase();
            const trustedSharePage = host === "tenor.com"
                || host === "www.tenor.com"
                || host === "giphy.com"
                || host === "www.giphy.com"
                || host.endsWith(".tenor.com")
                || host.endsWith(".giphy.com");
            if (url.protocol !== "https:" || !trustedSharePage) return "";
            url.hash = "";
            return url.href.slice(0, ALLIANCE_CHAT_GIF_MAX_LENGTH);
        } catch (err) {
            return "";
        }
    }

    function extractAllianceChatGifFromMessage(value) {
        const raw = String(value || "");
        const pattern = /https:\/\/[^\s<>"']+/gi;
        let match;
        while ((match = pattern.exec(raw))) {
            const candidate = String(match[0] || "").replace(/[.,!?;:)\]}]+$/g, "");
            const gifUrl = normalizeAllianceChatGifSubmissionUrl(candidate);
            if (!gifUrl) continue;
            const message = `${raw.slice(0, match.index)} ${raw.slice(match.index + candidate.length)}`
                .replace(/\s+/g, " ")
                .trim();
            return { message, gifUrl };
        }
        return { message: raw.replace(/\s+/g, " ").trim(), gifUrl: "" };
    }

    function toggleAllianceChat(forceOpen = null) {
        const open = forceOpen === null ? !getBool(STORAGE.allianceChatOpen, false) : Boolean(forceOpen);
        if (open && getBool(STORAGE.familyChatOpen, false)) {
            setBool(STORAGE.familyChatOpen, false);
            setAllianceChatInputArmed(document.querySelector("#emu-family-chat-root .emu-alliance-chat-input"), false);
            renderFamilyChat();
        }
        setAllianceChatInputArmed(document.querySelector("#emu-alliance-chat-root .emu-alliance-chat-input"), false);
        setBool(STORAGE.allianceChatOpen, open);
        if (open) {
            captureAllianceChatUnreadBoundary();
            state.allianceChatForceLatest = true;
            markAllianceChatSeen();
            syncAllianceChat(true);
        } else {
            state.allianceChatNewBoundaryId = "";
            state.allianceChatUnreadJumpPending = false;
            state.allianceChatOpenSeenAt = 0;
            state.allianceChatOpenSeenId = "";
            state.allianceChatAwaitingOpenSync = false;
        }
        renderAllianceChat();
    }

    function findTornChatShortcutBar() {
        const chatRoot = document.getElementById("chatRoot") || document.querySelector("[id*='chatRoot'],[class*='chatRoot']");
        if (!(chatRoot instanceof HTMLElement)) return null;
        if (state.allianceChatDockObservedRoot !== chatRoot) {
            state.allianceChatDockObserver?.disconnect();
            state.allianceChatDockObservedRoot = chatRoot;
            state.allianceChatDockObserver = new MutationObserver(() => {
                clearTimeout(state.allianceChatDockMutationTimer);
                state.allianceChatDockMutationTimer = window.setTimeout(() => {
                    positionAllianceChat();
                    positionFamilyChat();
                }, 80);
            });
            state.allianceChatDockObserver.observe(chatRoot, { childList: true, subtree: true });
        }
        const notesButton = chatRoot.querySelector("#notes_panel_button");
        const peopleButton = chatRoot.querySelector("#people_panel_button");
        const settingsButton = chatRoot.querySelector("#notes_settings_button");
        const nativeBar = notesButton?.parentElement;
        if (nativeBar instanceof HTMLElement
            && peopleButton?.parentElement === nativeBar
            && settingsButton?.parentElement === nativeBar) {
            const barRect = nativeBar.getBoundingClientRect();
            const buttonRect = notesButton.getBoundingClientRect();
            if (barRect.height >= 28 && barRect.height <= 82 && buttonRect.width >= 24 && buttonRect.width <= 90) {
                state.allianceChatNativeTabBar = nativeBar;
                state.allianceChatNativeTabWidth = buttonRect.width || 40;
                return nativeBar;
            }
        }
        const cached = state.allianceChatNativeTabBar;
        if (cached instanceof HTMLElement && cached.isConnected) {
            const rect = cached.getBoundingClientRect();
            if (rect.width >= 145 && rect.height >= 30 && rect.height <= 82
                && rect.right >= window.innerWidth - 55 && rect.bottom >= window.innerHeight - 140) return cached;
        }
        const ranked = Array.from(chatRoot.querySelectorAll("div,nav,ul"))
            .map(node => {
                const rect = node.getBoundingClientRect();
                const children = Array.from(node.children).filter(child => {
                    if (!(child instanceof HTMLElement) || child.id === "emu-alliance-chat-native-tab" || child.id === "emu-family-chat-native-tab") return false;
                    const childRect = child.getBoundingClientRect();
                    return childRect.width >= 24 && childRect.width <= 90 && childRect.height >= 28 && childRect.height <= 78;
                });
                const rects = children.map(child => child.getBoundingClientRect());
                const aligned = rects.length > 0 && Math.max(...rects.map(row => row.top)) - Math.min(...rects.map(row => row.top)) <= 8;
                const averageWidth = rects.length ? rects.reduce((sum, row) => sum + row.width, 0) / rects.length : 0;
                const widthSpread = rects.length ? Math.max(...rects.map(row => row.width)) - Math.min(...rects.map(row => row.width)) : 999;
                const score = (children.length === 5 ? 10000 : 0) + children.length * 500 + (aligned ? 1500 : 0)
                    - widthSpread * 10 - Math.abs(window.innerWidth - rect.right) * 8 - Math.abs(window.innerHeight - rect.bottom) * 2;
                return { node, rect, children, aligned, averageWidth, score };
            })
            .filter(({ rect, children, aligned }) => rect.width >= 145 && rect.width <= 430 && rect.height >= 30 && rect.height <= 82
                && rect.right >= window.innerWidth - 55 && rect.bottom >= window.innerHeight - 140
                && children.length >= 4 && children.length <= 7 && aligned)
            .sort((a, b) => b.score - a.score);
        const match = ranked[0] || null;
        state.allianceChatNativeTabBar = match?.node || null;
        state.allianceChatNativeTabWidth = match?.averageWidth || 40;
        return match?.node || null;
    }

    function clearAllianceChatNativeDock() {
        document.getElementById("emu-alliance-chat-native-tab")?.remove();
        state.allianceChatNativeTabBar = null;
        const root = document.getElementById("emu-alliance-chat-root");
        if (!root) return;
        root.classList.remove("is-native-docked", "is-shortcut-docked");
        const launcher = root.querySelector(".emu-alliance-chat-launcher");
        if (launcher) launcher.hidden = Boolean(document.getElementById("chatRoot"));
    }

    function mountAllianceChatNativeDock() {
        const root = document.getElementById("emu-alliance-chat-root");
        const tabBar = findTornChatShortcutBar();
        if (!root || !tabBar) {
            clearAllianceChatNativeDock();
            return false;
        }
        let tab = document.getElementById("emu-alliance-chat-native-tab");
        if (!tab || tab.parentElement !== tabBar) {
            tab?.remove();
            tab = document.createElement("button");
            tab.id = "emu-alliance-chat-native-tab";
            const notesButton = Array.from(tabBar.children).find(child => child.id === "notes_panel_button");
            const nativeButtonClass = notesButton instanceof HTMLElement ? notesButton.className : "";
            tab.className = nativeButtonClass;
            const iconClasses = notesButton?.querySelector("svg")?.className?.baseVal || "";
            const rawSvg = tab.innerHTML;
            tab.innerHTML = rawSvg.replace(/<svg\b([^>]*)>/, (m, attrs) =>
                /\sclass\s*=/.test(attrs) ? m : `<svg${attrs} class="${iconClasses}">`);
            tab.type = "button";
            tab.title = "Alliance Chat";
            tab.setAttribute("aria-label", "Alliance Chat");
            tab.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="emuAllianceChatShield" x1="12" y1="7" x2="52" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#d8b4fe"></stop><stop offset=".5" stop-color="#9333ea"></stop><stop offset="1" stop-color="#4c1d95"></stop></linearGradient></defs><path d="M32 5 54 13v16c0 14-9 24-22 30C19 53 10 43 10 29V13L32 5Z" fill="url(#emuAllianceChatShield)" stroke="#f5edff" stroke-width="3" stroke-linejoin="round"></path><path d="M32 14 46 19v10c0 9-5 16-14 21-9-5-14-12-14-21V19l14-5Z" fill="#19072a" opacity=".72"></path><path d="M32 17v29M20 29h24" fill="none" stroke="#eadcff" stroke-width="3" stroke-linecap="round" opacity=".9"></path></svg><b class="emu-alliance-chat-badge" hidden></b>`;
            tab.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                toggleAllianceChat();
            });
            tab.style.setProperty("--emu-alliance-chat-tab-width", `${Math.max(32, Math.round(Number(state.allianceChatNativeTabWidth || 40)))}px`);
            const scrollElement = document.scrollingElement;
            const scrollTop = Number(scrollElement?.scrollTop || 0);
            const scrollLeft = Number(scrollElement?.scrollLeft || 0);
            const routeKey = `${location.pathname}${location.search}${location.hash}`;
            tabBar.insertBefore(tab, notesButton || tabBar.firstElementChild);
            if (scrollElement && scrollTop > 0) {
                const restoreScroll = () => {
                    if (`${location.pathname}${location.search}${location.hash}` !== routeKey) return;
                    if (Math.abs(Number(scrollElement.scrollTop || 0) - scrollTop) > 4) scrollElement.scrollTo(scrollLeft, scrollTop);
                };
                window.requestAnimationFrame(restoreScroll);
                window.setTimeout(restoreScroll, 80);
                window.setTimeout(restoreScroll, 240);
            }
        }
        if (tabBar.dataset.emuAllianceChatBound !== "true") {
            tabBar.dataset.emuAllianceChatBound = "true";
            tabBar.addEventListener("click", event => {
                const target = event.target instanceof Element ? event.target : null;
                if (!target?.closest("#emu-alliance-chat-native-tab") && getBool(STORAGE.allianceChatOpen, false)) toggleAllianceChat(false);
                if (!target?.closest("#emu-family-chat-native-tab") && getBool(STORAGE.familyChatOpen, false)) toggleFamilyChat(false);
            }, true);
        }
        const tabRect = tabBar.getBoundingClientRect();
        tab.hidden = root.hidden;
        tab.classList.toggle("is-active", getBool(STORAGE.allianceChatOpen, false));
        const tabBadge = tab.querySelector(".emu-alliance-chat-badge");
        if (tabBadge) {
            tabBadge.textContent = state.allianceChatUnread > 99 ? "99+" : String(state.allianceChatUnread || "");
            tabBadge.hidden = state.allianceChatUnread <= 0;
        }
        root.classList.remove("is-native-docked");
        root.classList.add("is-shortcut-docked");
        root.style.setProperty("--emu-alliance-chat-right", `${Math.max(0, Math.round(window.innerWidth - tabRect.right))}px`);
        root.style.setProperty("--emu-alliance-chat-bottom", `${Math.max(0, Math.round(window.innerHeight - tabRect.bottom))}px`);
        root.style.setProperty("--emu-alliance-chat-shortcut-height", `${Math.round(tabRect.height)}px`);
        const launcher = root.querySelector(".emu-alliance-chat-launcher");
        if (launcher) launcher.hidden = true;
        return true;
    }

    function positionAllianceChat() {
        const root = document.getElementById("emu-alliance-chat-root");
        if (!root) return;
        if (mountAllianceChatNativeDock()) return;
        const compact = isTornPdaRuntime() || window.innerWidth <= 720;
        root.style.setProperty("--emu-alliance-chat-right", `${compact ? 12 : 278}px`);
        root.style.setProperty("--emu-alliance-chat-bottom", `${compact ? 76 : 12}px`);
    }

    function markAllianceChatSeen() {
        const latestRow = state.allianceChatMessages.reduce((latest, row) => (
            !latest || Number(row?.created_at || 0) >= Number(latest?.created_at || 0) ? row : latest
        ), null);
        const latest = Number(latestRow?.created_at || getValue(STORAGE.allianceChatSeenAt, 0) || 0);
        if (latest) setValue(STORAGE.allianceChatSeenAt, String(latest));
        if (latestRow?.id) setValue(STORAGE.allianceChatSeenId, String(latestRow.id));
        state.allianceChatUnread = 0;
        state.allianceChatMentionUnread = 0;
    }

    function setAllianceChatGifPanelActive(panel, active) {
        if (!(panel instanceof HTMLElement)) return;
        const gifUrl = normalizeAllianceChatGifUrl(panel.dataset.gifUrl || "");
        const enabled = Boolean(active && gifUrl);
        panel.style.backgroundImage = enabled
            ? `url("${gifUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`
            : "none";
        panel.classList.toggle("is-active", enabled);
    }

    function mountAllianceChatGifPanels(list, open) {
        state.allianceChatGifObserver?.disconnect?.();
        state.allianceChatGifObserver = null;
        const panels = Array.from(list?.querySelectorAll?.(".emu-alliance-chat-gif-media") || []);
        panels.forEach(panel => setAllianceChatGifPanelActive(panel, false));
        if (!open || !panels.length) return;
        if (typeof IntersectionObserver !== "function") {
            panels.slice(-6).forEach(panel => setAllianceChatGifPanelActive(panel, true));
            return;
        }
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => setAllianceChatGifPanelActive(entry.target, entry.isIntersecting));
        }, { root: list, rootMargin: "320px 0px", threshold: 0.01 });
        state.allianceChatGifObserver = observer;
        panels.forEach(panel => observer.observe(panel));
    }

    function renderAllianceChat() {
        const root = document.getElementById("emu-alliance-chat-root");
        if (!root) return;
        const open = getBool(STORAGE.allianceChatOpen, false);
        root.classList.toggle("is-open", open);
        root.hidden = isAttackPage() || state.sleeping;
        const panel = root.querySelector(".emu-alliance-chat-panel");
        if (panel) panel.hidden = !open;
        document.querySelectorAll("#emu-alliance-chat-root .emu-alliance-chat-badge,#emu-alliance-chat-native-tab .emu-alliance-chat-badge").forEach(badge => {
            badge.textContent = state.allianceChatUnread > 99 ? "99+" : String(state.allianceChatUnread || "");
            badge.hidden = state.allianceChatUnread <= 0;
            badge.classList.toggle("is-mention", state.allianceChatMentionUnread > 0);
            badge.title = state.allianceChatMentionUnread > 0 ? `${state.allianceChatMentionUnread} unread mention${state.allianceChatMentionUnread === 1 ? "" : "s"}` : "";
        });
        const nativeTab = document.getElementById("emu-alliance-chat-native-tab");
        if (nativeTab) {
            nativeTab.hidden = root.hidden;
            nativeTab.classList.toggle("is-active", open);
            nativeTab.setAttribute("aria-pressed", open ? "true" : "false");
        }
        const status = root.querySelector(".emu-alliance-chat-status");
        if (status) {
            status.textContent = !getApiKey()
                ? "Add your Torn API in Companion Settings to join the room."
                : state.allianceChatError || (state.allianceChatLoaded ? "All approved Emu and Nameless factions" : "Connecting...");
            status.classList.toggle("is-error", Boolean(state.allianceChatError));
        }
        const list = root.querySelector(".emu-alliance-chat-messages");
        if (list) {
            const nearBottom = open && list.clientHeight > 0 && list.scrollHeight - list.scrollTop - list.clientHeight < 80;
            const shouldScrollLatest = open && (state.allianceChatForceLatest || nearBottom || !state.allianceChatLoaded);
            const ownerId = Number(state.owner?.id || 0);
            const ownerName = String(state.owner?.name || "");
            const renderSignature = JSON.stringify([open, ownerId, ownerName, state.allianceChatNewBoundaryId, state.allianceChatMessages]);
            if (state.allianceChatRenderSignature !== renderSignature) {
                state.allianceChatRenderSignature = renderSignature;
                list.innerHTML = state.allianceChatMessages.length
                    ? state.allianceChatMessages.map(row => {
                        const senderId = Number(row?.senderId || 0);
                        const factionTag = String(row?.factionTag || "FAC").slice(0, 16);
                        const senderName = String(row?.senderName || `Player ${senderId || "?"}`).slice(0, 80);
                        const profileUrl = senderId > 0 ? `https://www.torn.com/profiles.php?XID=${senderId}` : "#";
                        const message = String(row?.message || "");
                        const mentioned = senderId !== ownerId && chatMessageMentionsPlayer(message, ownerName);
                        const gifUrl = normalizeAllianceChatGifUrl(row?.gifUrl || "");
                        const gifMarkup = gifUrl
                            ? `<div class="emu-alliance-chat-gif-media" data-gif-url="${escapeAttr(gifUrl)}" role="img" aria-label="GIF shared by ${escapeAttr(senderName)}"></div>`
                            : "";
                        const newDivider = String(row?.id || "") === state.allianceChatNewBoundaryId
                            ? `<div class="emu-alliance-chat-new-divider" role="separator" aria-label="New messages"><span>New messages</span></div>`
                            : "";
                        return `${newDivider}<article class="emu-alliance-chat-message${senderId === ownerId ? " is-own" : ""}${mentioned ? " is-mentioned" : ""}">
              <div class="emu-alliance-chat-meta"><span>[${escapeHtml(factionTag)}]</span><a href="${escapeAttr(profileUrl)}">${escapeHtml(senderName)}</a><time>${escapeHtml(timeAgo(row?.created_at))}</time></div>
              ${message ? `<p>${renderChatMessageHtml(message, ownerName)}</p>` : ""}${gifMarkup}
            </article>`;
                    }).join("")
                    : `<div class="emu-alliance-chat-empty">No messages yet. Say hello to the alliance.</div>`;
                window.requestAnimationFrame(() => mountAllianceChatGifPanels(list, open));
            }
            if (shouldScrollLatest) {
                state.allianceChatForceLatest = false;
                scrollAllianceChatToLatest();
            }
        }
        const input = root.querySelector(".emu-alliance-chat-input");
        const send = root.querySelector(".emu-alliance-chat-send");
        if (input) input.disabled = state.allianceChatSending || !getApiKey();
        if (send) {
            send.disabled = state.allianceChatSending || !getApiKey();
            send.textContent = state.allianceChatSending ? "Sending..." : "Send";
        }
        if (open) markAllianceChatSeen();
        positionAllianceChat();
    }

    function applyAllianceChatPayload(data) {
        if (Array.isArray(data?.mentionUsers)) {
            state.allianceChatMentionUsers = data.mentionUsers.filter(row => row && row.name).slice(0, 1000);
        }
        const incoming = Array.isArray(data?.messages) ? data.messages.filter(row => row && row.id) : [];
        const current = Array.isArray(state.allianceChatMessages) ? state.allianceChatMessages.filter(row => row && row.id) : [];
        const previousIds = new Set(current.map(row => String(row?.id || "")));
        const mergedById = new Map((data?.incremental ? current.concat(incoming) : incoming).map(row => [String(row.id), row]));
        const merged = Array.from(mergedById.values()).sort((a, b) => (
            Number(a?.created_at || 0) - Number(b?.created_at || 0)
            || String(a?.id || "").localeCompare(String(b?.id || ""))
        ));
        const seenAt = Number(getValue(STORAGE.allianceChatSeenAt, 0) || 0);
        const seenId = String(getValue(STORAGE.allianceChatSeenId, "") || "");
        const ownerId = Number(data?.owner?.id || state.owner?.id || 0);
        const ownerName = String(data?.owner?.name || state.owner?.name || "");
        const newRows = state.allianceChatLoaded
            ? incoming.filter(row => !previousIds.has(String(row.id)) && Number(row?.senderId || 0) !== ownerId)
            : [];
        const newMentions = newRows.filter(row => chatMessageMentionsPlayer(row?.message, ownerName));
        if (!state.allianceChatLoaded) {
            if (seenAt > 0 || seenId) {
                const unseenRows = chatRowsAfterSeen(incoming, seenAt, seenId)
                    .filter(row => Number(row?.senderId || 0) !== ownerId);
                state.allianceChatUnread = unseenRows.length;
                state.allianceChatMentionUnread = unseenRows.filter(row => chatMessageMentionsPlayer(row?.message, ownerName)).length;
            } else if (incoming.length) {
                const latest = incoming[incoming.length - 1];
                setValue(STORAGE.allianceChatSeenAt, String(Number(latest?.created_at || 0)));
                if (latest?.id) setValue(STORAGE.allianceChatSeenId, String(latest.id));
            }
        } else if (!getBool(STORAGE.allianceChatOpen, false)) {
            state.allianceChatUnread += newRows.length;
            state.allianceChatMentionUnread += newMentions.length;
            newMentions.slice(-3).forEach(row => showChatMentionNotification("alliance", row));
        }
        state.allianceChatMessages = merged.slice(-200);
        if (getBool(STORAGE.allianceChatOpen, false) && state.allianceChatAwaitingOpenSync) {
            const baselineExists = state.allianceChatOpenSeenAt > 0 || Boolean(state.allianceChatOpenSeenId);
            const unseen = baselineExists
                ? chatRowsAfterSeen(state.allianceChatMessages, state.allianceChatOpenSeenAt, state.allianceChatOpenSeenId)
                : [];
            if (!state.allianceChatNewBoundaryId && unseen.some(row => Number(row?.senderId || 0) !== ownerId)) {
                state.allianceChatNewBoundaryId = String(unseen[0]?.id || "");
                state.allianceChatUnreadJumpPending = true;
            }
            state.allianceChatAwaitingOpenSync = false;
        }
        if (data?.owner && !state.owner) state.owner = data.owner;
        if (data?.faction && !state.faction) state.faction = data.faction;
        state.allianceChatLoaded = true;
        state.allianceChatFailureCount = 0;
        state.allianceChatError = "";
        renderAllianceChat();
    }

    async function syncAllianceChat(force = false) {
        if (state.sleeping || isAttackPage() || document.hidden || state.allianceChatInFlight) return;
        if (!getBool(STORAGE.enabled, true) || !getApiKey()) {
            renderAllianceChat();
            return;
        }
        const now = Date.now();
        const chatOpen = getBool(STORAGE.allianceChatOpen, false);
        const minimumDelay = chatOpen ? ALLIANCE_CHAT_POLL_MS : ALLIANCE_CHAT_CLOSED_POLL_MS;
        if (!force && state.allianceChatLastSyncAt && now - state.allianceChatLastSyncAt < minimumDelay - 250) return;
        state.allianceChatLastSyncAt = now;
        state.allianceChatInFlight = true;
        try {
            const latestId = state.allianceChatLoaded
                ? String(state.allianceChatMessages[state.allianceChatMessages.length - 1]?.id || "")
                : "";
            const cursorQuery = latestId ? `&cursor=${encodeURIComponent(latestId)}` : "";
            const data = await apiRequest(`/api/emu-caller/alliance-chat?limit=100${cursorQuery}`, null, "GET");
            applyAllianceChatPayload(data);
        } catch (err) {
            state.allianceChatFailureCount += 1;
            state.allianceChatError = state.allianceChatFailureCount >= 3
                ? `Chat reconnecting: ${friendlyError(err)}`
                : "";
            renderAllianceChat();
        } finally {
            state.allianceChatInFlight = false;
        }
    }

    async function sendAllianceChatMessage(message, gifUrl = "") {
        if (state.allianceChatSending) return;
        const extracted = extractAllianceChatGifFromMessage(message);
        const text = extracted.message.slice(0, ALLIANCE_CHAT_MAX_LENGTH);
        const safeGifUrl = normalizeAllianceChatGifSubmissionUrl(gifUrl) || extracted.gifUrl;
        if (!text && !safeGifUrl) return;
        state.allianceChatSending = true;
        state.allianceChatError = "";
        const input = document.querySelector("#emu-alliance-chat-root .emu-alliance-chat-input");
        if (input) input.value = "";
        renderAllianceChat();
        try {
            const latestId = state.allianceChatLoaded
                ? String(state.allianceChatMessages[state.allianceChatMessages.length - 1]?.id || "")
                : "";
            const data = await apiRequest("/api/emu-caller/alliance-chat", { message: text, gifUrl: safeGifUrl, cursor: latestId }, "POST");
            applyAllianceChatPayload(data);
        } catch (err) {
            state.allianceChatError = friendlyError(err);
            const retryInput = document.querySelector("#emu-alliance-chat-root .emu-alliance-chat-input");
            if (retryInput && !retryInput.value) retryInput.value = message;
        } finally {
            state.allianceChatSending = false;
            renderAllianceChat();
        }
    }

    function mountAllianceChat() {
        let root = document.getElementById("emu-alliance-chat-root");
        if (!root) {
            root = document.createElement("div");
            root.id = "emu-alliance-chat-root";
            root.dataset.brand = RUNTIME_BRAND;
            root.innerHTML = `
        <button type="button" class="emu-alliance-chat-launcher" title="Open Alliance Chat" aria-label="Open Alliance Chat">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5-3 9-8 11-5-2-8-6-8-11V5l8-3Z"></path></svg>
          <span>Alliance</span><b class="emu-alliance-chat-badge" hidden></b>
        </button>
        <section class="emu-alliance-chat-panel" hidden>
          <header><div><strong>Alliance Chat</strong><small>Shared Emu + Nameless room</small></div><button type="button" class="emu-alliance-chat-close" aria-label="Close chat">&times;</button></header>
          <div class="emu-alliance-chat-status">Connecting...</div>
          <div class="emu-alliance-chat-messages" aria-live="polite"></div>
          <form class="emu-alliance-chat-compose"><div class="emu-alliance-chat-suggestions" role="listbox" hidden></div><input class="emu-alliance-chat-input" maxlength="${ALLIANCE_CHAT_MAX_LENGTH}" autocomplete="off" inputmode="none" readonly data-emu-chat-input-armed="false" placeholder="Message the alliance or paste a GIF link..." /><button class="emu-alliance-chat-send" type="submit">Send</button></form>
        </section>`;
            document.body.appendChild(root);
            root.querySelector(".emu-alliance-chat-launcher")?.addEventListener("click", () => toggleAllianceChat());
            root.querySelector(".emu-alliance-chat-close")?.addEventListener("click", () => {
                toggleAllianceChat(false);
            });
            root.querySelector(".emu-alliance-chat-compose")?.addEventListener("submit", event => {
                event.preventDefault();
                sendAllianceChatMessage(root.querySelector(".emu-alliance-chat-input")?.value || "");
            });
            const chatInput = root.querySelector(".emu-alliance-chat-input");
            bindChatMentionAutocomplete(root, chatInput);
            const armChatInput = () => setAllianceChatInputArmed(chatInput, true);
            chatInput?.addEventListener("pointerdown", armChatInput, { passive: true });
            chatInput?.addEventListener("touchstart", armChatInput, { passive: true });
            chatInput?.addEventListener("mousedown", armChatInput, { passive: true });
            chatInput?.addEventListener("click", armChatInput, { passive: true });
            chatInput?.addEventListener("contextmenu", armChatInput, { passive: true });
            chatInput?.addEventListener("beforeinput", event => {
                if (event.inputType === "insertFromPaste") setAllianceChatInputArmed(chatInput, true);
            });
            chatInput?.addEventListener("paste", event => pasteIntoAllianceChatInput(chatInput, event));
            chatInput?.addEventListener("focus", () => {
                if (chatInput.dataset.emuChatInputArmed !== "true") window.requestAnimationFrame(() => chatInput.blur());
            });
        }
        if (!state.allianceChatPositionBound) {
            state.allianceChatPositionBound = true;
            window.addEventListener("resize", positionAllianceChat, { passive: true });
        }
        if (getBool(STORAGE.allianceChatOpen, false) && !state.allianceChatLoaded && !state.allianceChatAwaitingOpenSync) {
            captureAllianceChatUnreadBoundary();
        }
        renderAllianceChat();
    }

    function scrollFamilyChatToLatest() {
        const list = document.querySelector("#emu-family-chat-root .emu-alliance-chat-messages");
        if (!(list instanceof HTMLElement) || !getBool(STORAGE.familyChatOpen, false)) return;
        const jumpToUnread = Boolean(state.familyChatUnreadJumpPending && state.familyChatNewBoundaryId);
        state.familyChatUnreadJumpPending = false;
        const scrollLatest = () => {
            if (!getBool(STORAGE.familyChatOpen, false) || !list.isConnected) return;
            const divider = jumpToUnread ? list.querySelector(".emu-alliance-chat-new-divider") : null;
            if (divider instanceof HTMLElement) {
                const listRect = list.getBoundingClientRect();
                const dividerRect = divider.getBoundingClientRect();
                list.scrollTop = Math.max(0, list.scrollTop + dividerRect.top - listRect.top - 6);
                return;
            }
            list.scrollTop = list.scrollHeight;
        };
        window.requestAnimationFrame(scrollLatest);
        window.setTimeout(scrollLatest, 60);
        window.setTimeout(scrollLatest, 180);
    }

    function toggleFamilyChat(forceOpen = null) {
        const open = forceOpen === null ? !getBool(STORAGE.familyChatOpen, false) : Boolean(forceOpen);
        if (open && getBool(STORAGE.allianceChatOpen, false)) {
            setBool(STORAGE.allianceChatOpen, false);
            setAllianceChatInputArmed(document.querySelector("#emu-alliance-chat-root .emu-alliance-chat-input"), false);
            renderAllianceChat();
        }
        setAllianceChatInputArmed(document.querySelector("#emu-family-chat-root .emu-alliance-chat-input"), false);
        setBool(STORAGE.familyChatOpen, open);
        if (open) {
            captureFamilyChatUnreadBoundary();
            state.familyChatForceLatest = true;
            markFamilyChatSeen();
            syncFamilyChat(true);
        } else {
            state.familyChatNewBoundaryId = "";
            state.familyChatUnreadJumpPending = false;
            state.familyChatOpenSeenAt = 0;
            state.familyChatOpenSeenId = "";
            state.familyChatAwaitingOpenSync = false;
        }
        renderFamilyChat();
    }

    function clearFamilyChatNativeDock() {
        document.getElementById("emu-family-chat-native-tab")?.remove();
        const root = document.getElementById("emu-family-chat-root");
        if (!root) return;
        root.classList.remove("is-native-docked", "is-shortcut-docked");
        const launcher = root.querySelector(".emu-alliance-chat-launcher");
        if (launcher) launcher.hidden = Boolean(document.getElementById("chatRoot"));
    }

    function mountFamilyChatNativeDock() {
        const root = document.getElementById("emu-family-chat-root");
        const tabBar = findTornChatShortcutBar();
        if (!root || !tabBar) {
            clearFamilyChatNativeDock();
            return false;
        }
        let tab = document.getElementById("emu-family-chat-native-tab");
        if (!tab || tab.parentElement !== tabBar) {
            tab?.remove();
            tab = document.createElement("button");
            tab.id = "emu-family-chat-native-tab";
            const notesButton = Array.from(tabBar.children).find(child => child.id === "notes_panel_button");
            const nativeButtonClass = notesButton instanceof HTMLElement ? notesButton.className : "";
            tab.className = nativeButtonClass;
            tab.type = "button";
            tab.title = "Emu Family Chat";
            tab.setAttribute("aria-label", "Emu Family Chat");
            tab.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="emuFamilyChatShield" x1="10" y1="7" x2="54" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#b9ffe5"></stop><stop offset=".5" stop-color="#26c989"></stop><stop offset="1" stop-color="#07583c"></stop></linearGradient></defs><path d="M32 5 54 13v16c0 14-9 24-22 30C19 53 10 43 10 29V13L32 5Z" fill="url(#emuFamilyChatShield)" stroke="#eafff7" stroke-width="3" stroke-linejoin="round"></path><path d="M18 21h28v23H18z" rx="5" fill="#062b20" opacity=".78"></path><text x="32" y="36.5" fill="#eafff7" font-family="Arial,sans-serif" font-size="11" font-weight="900" text-anchor="middle">EMU</text></svg><b class="emu-alliance-chat-badge" hidden></b>`;
            const iconClasses = notesButton?.querySelector("svg")?.className?.baseVal || "";
            if (iconClasses) {
                tab.innerHTML = tab.innerHTML.replace(/<svg\b([^>]*)>/, (m, attrs) =>
                    /\sclass\s*=/.test(attrs) ? m : `<svg${attrs} class="${iconClasses}">`);
            }
            tab.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                toggleFamilyChat();
            });
            tab.style.setProperty("--emu-alliance-chat-tab-width", `${Math.max(32, Math.round(Number(state.allianceChatNativeTabWidth || 40)))}px`);
            const scrollElement = document.scrollingElement;
            const scrollTop = Number(scrollElement?.scrollTop || 0);
            const scrollLeft = Number(scrollElement?.scrollLeft || 0);
            const routeKey = `${location.pathname}${location.search}${location.hash}`;
            const allianceButton = document.getElementById("emu-alliance-chat-native-tab");
            const insertionPoint = allianceButton?.parentElement === tabBar ? allianceButton : (notesButton || tabBar.firstElementChild);
            tabBar.insertBefore(tab, insertionPoint);
            if (scrollElement && scrollTop > 0) {
                const restoreScroll = () => {
                    if (`${location.pathname}${location.search}${location.hash}` !== routeKey) return;
                    if (Math.abs(Number(scrollElement.scrollTop || 0) - scrollTop) > 4) scrollElement.scrollTo(scrollLeft, scrollTop);
                };
                window.requestAnimationFrame(restoreScroll);
                window.setTimeout(restoreScroll, 80);
                window.setTimeout(restoreScroll, 240);
            }
        }
        const tabRect = tabBar.getBoundingClientRect();
        tab.hidden = root.hidden;
        tab.classList.toggle("is-active", getBool(STORAGE.familyChatOpen, false));
        const tabBadge = tab.querySelector(".emu-alliance-chat-badge");
        if (tabBadge) {
            tabBadge.textContent = state.familyChatUnread > 99 ? "99+" : String(state.familyChatUnread || "");
            tabBadge.hidden = state.familyChatUnread <= 0;
        }
        root.classList.remove("is-native-docked");
        root.classList.add("is-shortcut-docked");
        root.style.setProperty("--emu-alliance-chat-right", `${Math.max(0, Math.round(window.innerWidth - tabRect.right))}px`);
        root.style.setProperty("--emu-alliance-chat-bottom", `${Math.max(0, Math.round(window.innerHeight - tabRect.bottom))}px`);
        root.style.setProperty("--emu-alliance-chat-shortcut-height", `${Math.round(tabRect.height)}px`);
        const launcher = root.querySelector(".emu-alliance-chat-launcher");
        if (launcher) launcher.hidden = true;
        return true;
    }

    function positionFamilyChat() {
        const root = document.getElementById("emu-family-chat-root");
        if (!root) return;
        if (mountFamilyChatNativeDock()) return;
        const compact = isTornPdaRuntime() || window.innerWidth <= 720;
        root.style.setProperty("--emu-alliance-chat-right", `${compact ? 64 : 330}px`);
        root.style.setProperty("--emu-alliance-chat-bottom", `${compact ? 76 : 12}px`);
    }

    function markFamilyChatSeen() {
        const latestRow = state.familyChatMessages.reduce((latest, row) => (
            !latest || Number(row?.created_at || 0) >= Number(latest?.created_at || 0) ? row : latest
        ), null);
        const latest = Number(latestRow?.created_at || getValue(STORAGE.familyChatSeenAt, 0) || 0);
        if (latest) setValue(STORAGE.familyChatSeenAt, String(latest));
        if (latestRow?.id) setValue(STORAGE.familyChatSeenId, String(latestRow.id));
        state.familyChatUnread = 0;
        state.familyChatMentionUnread = 0;
    }

    function captureFamilyChatUnreadBoundary() {
        state.familyChatOpenSeenAt = Number(getValue(STORAGE.familyChatSeenAt, 0) || 0);
        state.familyChatOpenSeenId = String(getValue(STORAGE.familyChatSeenId, "") || "");
        const unseen = chatRowsAfterSeen(
            state.familyChatMessages,
            state.familyChatOpenSeenAt,
            state.familyChatOpenSeenId
        );
        const ownerId = Number(state.owner?.id || 0);
        state.familyChatNewBoundaryId = unseen.some(row => Number(row?.senderId || 0) !== ownerId)
            ? String(unseen[0]?.id || "")
            : "";
        state.familyChatUnreadJumpPending = Boolean(state.familyChatNewBoundaryId);
        state.familyChatAwaitingOpenSync = true;
    }

    function mountFamilyChatGifPanels(list, open) {
        state.familyChatGifObserver?.disconnect?.();
        state.familyChatGifObserver = null;
        const panels = Array.from(list?.querySelectorAll?.(".emu-alliance-chat-gif-media") || []);
        panels.forEach(panel => setAllianceChatGifPanelActive(panel, false));
        if (!open || !panels.length) return;
        if (typeof IntersectionObserver !== "function") {
            panels.slice(-6).forEach(panel => setAllianceChatGifPanelActive(panel, true));
            return;
        }
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => setAllianceChatGifPanelActive(entry.target, entry.isIntersecting));
        }, { root: list, rootMargin: "320px 0px", threshold: 0.01 });
        state.familyChatGifObserver = observer;
        panels.forEach(panel => observer.observe(panel));
    }

    function renderFamilyChat() {
        const root = document.getElementById("emu-family-chat-root");
        if (!root) return;
        const open = getBool(STORAGE.familyChatOpen, false);
        root.classList.toggle("is-open", open);
        root.hidden = isAttackPage() || state.sleeping;
        const panel = root.querySelector(".emu-alliance-chat-panel");
        if (panel) panel.hidden = !open;
        document.querySelectorAll("#emu-family-chat-root .emu-alliance-chat-badge,#emu-family-chat-native-tab .emu-alliance-chat-badge").forEach(badge => {
            badge.textContent = state.familyChatUnread > 99 ? "99+" : String(state.familyChatUnread || "");
            badge.hidden = state.familyChatUnread <= 0;
            badge.classList.toggle("is-mention", state.familyChatMentionUnread > 0);
            badge.title = state.familyChatMentionUnread > 0 ? `${state.familyChatMentionUnread} unread mention${state.familyChatMentionUnread === 1 ? "" : "s"}` : "";
        });
        const nativeTab = document.getElementById("emu-family-chat-native-tab");
        if (nativeTab) {
            nativeTab.hidden = root.hidden;
            nativeTab.classList.toggle("is-active", open);
            nativeTab.setAttribute("aria-pressed", open ? "true" : "false");
        }
        const status = root.querySelector(".emu-alliance-chat-status");
        if (status) {
            status.textContent = !getApiKey()
                ? "Add your Torn API in Companion Settings to join the room."
                : state.familyChatError || (state.familyChatLoaded ? "Approved Emu family factions only" : "Connecting...");
            status.classList.toggle("is-error", Boolean(state.familyChatError));
        }
        const list = root.querySelector(".emu-alliance-chat-messages");
        if (list) {
            const nearBottom = open && list.clientHeight > 0 && list.scrollHeight - list.scrollTop - list.clientHeight < 80;
            const shouldScrollLatest = open && (state.familyChatForceLatest || nearBottom || !state.familyChatLoaded);
            const ownerId = Number(state.owner?.id || 0);
            const ownerName = String(state.owner?.name || "");
            const renderSignature = JSON.stringify([open, ownerId, ownerName, state.familyChatNewBoundaryId, state.familyChatMessages]);
            if (state.familyChatRenderSignature !== renderSignature) {
                state.familyChatRenderSignature = renderSignature;
                list.innerHTML = state.familyChatMessages.length
                    ? state.familyChatMessages.map(row => {
                        const senderId = Number(row?.senderId || 0);
                        const factionTag = String(row?.factionTag || "EMU").slice(0, 16);
                        const senderName = String(row?.senderName || `Player ${senderId || "?"}`).slice(0, 80);
                        const profileUrl = senderId > 0 ? `https://www.torn.com/profiles.php?XID=${senderId}` : "#";
                        const message = String(row?.message || "");
                        const mentioned = senderId !== ownerId && chatMessageMentionsPlayer(message, ownerName);
                        const gifUrl = normalizeAllianceChatGifUrl(row?.gifUrl || "");
                        const gifMarkup = gifUrl
                            ? `<div class="emu-alliance-chat-gif-media" data-gif-url="${escapeAttr(gifUrl)}" role="img" aria-label="GIF shared by ${escapeAttr(senderName)}"></div>`
                            : "";
                        const newDivider = String(row?.id || "") === state.familyChatNewBoundaryId
                            ? `<div class="emu-alliance-chat-new-divider" role="separator" aria-label="New messages"><span>New messages</span></div>`
                            : "";
                        return `${newDivider}<article class="emu-alliance-chat-message${senderId === ownerId ? " is-own" : ""}${mentioned ? " is-mentioned" : ""}">
              <div class="emu-alliance-chat-meta"><span>[${escapeHtml(factionTag)}]</span><a href="${escapeAttr(profileUrl)}">${escapeHtml(senderName)}</a><time>${escapeHtml(timeAgo(row?.created_at))}</time></div>
              ${message ? `<p>${renderChatMessageHtml(message, ownerName)}</p>` : ""}${gifMarkup}
            </article>`;
                    }).join("")
                    : `<div class="emu-alliance-chat-empty">No messages yet. Say hello to the Emu family.</div>`;
                window.requestAnimationFrame(() => mountFamilyChatGifPanels(list, open));
            }
            if (shouldScrollLatest) {
                state.familyChatForceLatest = false;
                scrollFamilyChatToLatest();
            }
        }
        const input = root.querySelector(".emu-alliance-chat-input");
        const send = root.querySelector(".emu-alliance-chat-send");
        if (input) input.disabled = state.familyChatSending || !getApiKey();
        if (send) {
            send.disabled = state.familyChatSending || !getApiKey();
            send.textContent = state.familyChatSending ? "Sending..." : "Send";
        }
        if (open) markFamilyChatSeen();
        positionFamilyChat();
    }

    function applyFamilyChatPayload(data) {
        if (Array.isArray(data?.mentionUsers)) {
            state.familyChatMentionUsers = data.mentionUsers.filter(row => row && row.name).slice(0, 1000);
        }
        const incoming = Array.isArray(data?.messages) ? data.messages.filter(row => row && row.id) : [];
        const current = Array.isArray(state.familyChatMessages) ? state.familyChatMessages.filter(row => row && row.id) : [];
        const previousIds = new Set(current.map(row => String(row?.id || "")));
        const mergedById = new Map((data?.incremental ? current.concat(incoming) : incoming).map(row => [String(row.id), row]));
        const merged = Array.from(mergedById.values()).sort((a, b) => (
            Number(a?.created_at || 0) - Number(b?.created_at || 0)
            || String(a?.id || "").localeCompare(String(b?.id || ""))
        ));
        const seenAt = Number(getValue(STORAGE.familyChatSeenAt, 0) || 0);
        const seenId = String(getValue(STORAGE.familyChatSeenId, "") || "");
        const ownerId = Number(data?.owner?.id || state.owner?.id || 0);
        const ownerName = String(data?.owner?.name || state.owner?.name || "");
        const newRows = state.familyChatLoaded
            ? incoming.filter(row => !previousIds.has(String(row.id)) && Number(row?.senderId || 0) !== ownerId)
            : [];
        const newMentions = newRows.filter(row => chatMessageMentionsPlayer(row?.message, ownerName));
        if (!state.familyChatLoaded) {
            if (seenAt > 0 || seenId) {
                const unseenRows = chatRowsAfterSeen(incoming, seenAt, seenId)
                    .filter(row => Number(row?.senderId || 0) !== ownerId);
                state.familyChatUnread = unseenRows.length;
                state.familyChatMentionUnread = unseenRows.filter(row => chatMessageMentionsPlayer(row?.message, ownerName)).length;
            } else if (incoming.length) {
                const latest = incoming[incoming.length - 1];
                setValue(STORAGE.familyChatSeenAt, String(Number(latest?.created_at || 0)));
                if (latest?.id) setValue(STORAGE.familyChatSeenId, String(latest.id));
            }
        } else if (!getBool(STORAGE.familyChatOpen, false)) {
            state.familyChatUnread += newRows.length;
            state.familyChatMentionUnread += newMentions.length;
            newMentions.slice(-3).forEach(row => showChatMentionNotification("family", row));
        }
        state.familyChatMessages = merged.slice(-200);
        if (getBool(STORAGE.familyChatOpen, false) && state.familyChatAwaitingOpenSync) {
            const baselineExists = state.familyChatOpenSeenAt > 0 || Boolean(state.familyChatOpenSeenId);
            const unseen = baselineExists
                ? chatRowsAfterSeen(state.familyChatMessages, state.familyChatOpenSeenAt, state.familyChatOpenSeenId)
                : [];
            if (!state.familyChatNewBoundaryId && unseen.some(row => Number(row?.senderId || 0) !== ownerId)) {
                state.familyChatNewBoundaryId = String(unseen[0]?.id || "");
                state.familyChatUnreadJumpPending = true;
            }
            state.familyChatAwaitingOpenSync = false;
        }
        if (data?.owner && !state.owner) state.owner = data.owner;
        if (data?.faction && !state.faction) state.faction = data.faction;
        state.familyChatLoaded = true;
        state.familyChatFailureCount = 0;
        state.familyChatError = "";
        renderFamilyChat();
    }

    async function syncFamilyChat(force = false) {
        if (state.sleeping || isAttackPage() || document.hidden || state.familyChatInFlight) return;
        if (!getBool(STORAGE.enabled, true) || !getApiKey()) {
            renderFamilyChat();
            return;
        }
        const now = Date.now();
        const chatOpen = getBool(STORAGE.familyChatOpen, false);
        const minimumDelay = chatOpen ? ALLIANCE_CHAT_POLL_MS : ALLIANCE_CHAT_CLOSED_POLL_MS;
        if (!force && state.familyChatLastSyncAt && now - state.familyChatLastSyncAt < minimumDelay - 250) return;
        state.familyChatLastSyncAt = now;
        state.familyChatInFlight = true;
        try {
            const latestId = state.familyChatLoaded
                ? String(state.familyChatMessages[state.familyChatMessages.length - 1]?.id || "")
                : "";
            const cursorQuery = latestId ? `&cursor=${encodeURIComponent(latestId)}` : "";
            const data = await apiRequest(`/api/emu-caller/alliance-chat?room=family&limit=100${cursorQuery}`, null, "GET");
            applyFamilyChatPayload(data);
        } catch (err) {
            state.familyChatFailureCount += 1;
            state.familyChatError = state.familyChatFailureCount >= 3
                ? `Family chat reconnecting: ${friendlyError(err)}`
                : "";
            renderFamilyChat();
        } finally {
            state.familyChatInFlight = false;
        }
    }

    async function sendFamilyChatMessage(message, gifUrl = "") {
        if (state.familyChatSending) return;
        const extracted = extractAllianceChatGifFromMessage(message);
        const text = extracted.message.slice(0, ALLIANCE_CHAT_MAX_LENGTH);
        const safeGifUrl = normalizeAllianceChatGifSubmissionUrl(gifUrl) || extracted.gifUrl;
        if (!text && !safeGifUrl) return;
        state.familyChatSending = true;
        state.familyChatError = "";
        const input = document.querySelector("#emu-family-chat-root .emu-alliance-chat-input");
        if (input) input.value = "";
        renderFamilyChat();
        try {
            const latestId = state.familyChatLoaded
                ? String(state.familyChatMessages[state.familyChatMessages.length - 1]?.id || "")
                : "";
            const data = await apiRequest("/api/emu-caller/alliance-chat", { room: "family", message: text, gifUrl: safeGifUrl, cursor: latestId }, "POST");
            applyFamilyChatPayload(data);
        } catch (err) {
            state.familyChatError = friendlyError(err);
            const retryInput = document.querySelector("#emu-family-chat-root .emu-alliance-chat-input");
            if (retryInput && !retryInput.value) retryInput.value = message;
        } finally {
            state.familyChatSending = false;
            renderFamilyChat();
        }
    }

    function mountFamilyChat() {
        let root = document.getElementById("emu-family-chat-root");
        if (!root) {
            root = document.createElement("div");
            root.id = "emu-family-chat-root";
            root.dataset.brand = "emu-family";
            root.innerHTML = `
        <button type="button" class="emu-alliance-chat-launcher" title="Open Emu Family Chat" aria-label="Open Emu Family Chat">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5-3 9-8 11-5-2-8-6-8-11V5l8-3Z"></path></svg>
          <span>Emu Family</span><b class="emu-alliance-chat-badge" hidden></b>
        </button>
        <section class="emu-alliance-chat-panel" hidden>
          <header><div><strong>Emu Family Chat</strong><small>Private room for Emu family factions</small></div><button type="button" class="emu-alliance-chat-close" aria-label="Close chat">&times;</button></header>
          <div class="emu-alliance-chat-status">Connecting...</div>
          <div class="emu-alliance-chat-messages" aria-live="polite"></div>
          <form class="emu-alliance-chat-compose"><div class="emu-alliance-chat-suggestions" role="listbox" hidden></div><input class="emu-alliance-chat-input" maxlength="${ALLIANCE_CHAT_MAX_LENGTH}" autocomplete="off" inputmode="none" readonly data-emu-chat-input-armed="false" placeholder="Message the Emu family or paste a GIF link..." /><button class="emu-alliance-chat-send" type="submit">Send</button></form>
        </section>`;
            document.body.appendChild(root);
            root.querySelector(".emu-alliance-chat-launcher")?.addEventListener("click", () => toggleFamilyChat());
            root.querySelector(".emu-alliance-chat-close")?.addEventListener("click", () => toggleFamilyChat(false));
            root.querySelector(".emu-alliance-chat-compose")?.addEventListener("submit", event => {
                event.preventDefault();
                sendFamilyChatMessage(root.querySelector(".emu-alliance-chat-input")?.value || "");
            });
            const chatInput = root.querySelector(".emu-alliance-chat-input");
            bindChatMentionAutocomplete(root, chatInput);
            const armChatInput = () => setAllianceChatInputArmed(chatInput, true);
            chatInput?.addEventListener("pointerdown", armChatInput, { passive: true });
            chatInput?.addEventListener("touchstart", armChatInput, { passive: true });
            chatInput?.addEventListener("mousedown", armChatInput, { passive: true });
            chatInput?.addEventListener("click", armChatInput, { passive: true });
            chatInput?.addEventListener("contextmenu", armChatInput, { passive: true });
            chatInput?.addEventListener("beforeinput", event => {
                if (event.inputType === "insertFromPaste") setAllianceChatInputArmed(chatInput, true);
            });
            chatInput?.addEventListener("paste", event => pasteIntoAllianceChatInput(chatInput, event));
            chatInput?.addEventListener("focus", () => {
                if (chatInput.dataset.emuChatInputArmed !== "true") window.requestAnimationFrame(() => chatInput.blur());
            });
        }
        if (!state.familyChatPositionBound) {
            state.familyChatPositionBound = true;
            window.addEventListener("resize", positionFamilyChat, { passive: true });
        }
        if (getBool(STORAGE.familyChatOpen, false) && !state.familyChatLoaded && !state.familyChatAwaitingOpenSync) {
            captureFamilyChatUnreadBoundary();
        }
        renderFamilyChat();
    }

    function startLoops() {
        if (enterFinishedWarSleep()) return;
        if (!state.visibilityBound) {
            state.visibilityBound = true;
            document.addEventListener("visibilitychange", () => {
                if (!document.hidden) {
                    if (enterFinishedWarSleep()) return;
                    configureCallerSurfacePolling(true);
                    scanSoon(150);
                }
            });
        }
        configureCallerSurfacePolling(true);
        mountAllianceChat();
        mountFamilyChat();
        if (!state.allianceChatTimer) state.allianceChatTimer = setInterval(syncAllianceChat, ALLIANCE_CHAT_POLL_MS);
        if (!state.familyChatTimer) {
            state.familyChatTimer = window.setTimeout(() => {
                syncFamilyChat();
                state.familyChatTimer = window.setInterval(syncFamilyChat, ALLIANCE_CHAT_POLL_MS);
            }, Math.round(ALLIANCE_CHAT_POLL_MS / 2));
        }
        syncAllianceChat();
        if (!state.mainObserver) {
            state.mainObserver = new MutationObserver(mutations => {
                if (enterFinishedWarSleep()) return;
                if (isAttackPage()) return;
                if (isHospitalViewPage()) mountPennywiseReviveButton();
                recoverRemovedCallerRoot(mutations);
                const hallOfFamePage = isHallOfFameBspPage();
                const capturedHallOfFame = hallOfFamePage ? captureHallOfFameMutationData(mutations) : 0;
                if (hallOfFamePage && (capturedHallOfFame || mutations.some(hasHallOfFameRosterMutation))) {
                    startHallOfFameBspBootstrap();
                    scanSoon(35);
                    return;
                }
                if (isStandardFactionBspPage() && mutations.some(hasStandardFactionRosterMutation)) {
                    scanSoon(0);
                    return;
                }
                const callerSurfaceChanged = mutations.some(hasCallerSurfaceChange);
                if (isAdvancedSearchBspPage() && callerSurfaceChanged) {
                    queueAdvancedSearchRefresh();
                    return;
                }
                if (!capturedHallOfFame && !callerSurfaceChanged) return;
                ensureScopedWarObservers();
                scanSoon(SCAN_DEBOUNCE_MS);
            });
            state.mainObserver.observe(document.body, { childList: true, subtree: true });
        }
        ensureScopedWarObservers();
        startProfileBspBootstrap();
        startCompanyBspBootstrap();
        startHallOfFameBspBootstrap();
        bindHallOfFameNavigationRefresh();
        startAdvancedSearchBspBootstrap();
        bindAdvancedSearchNavigationRefresh();
    }

    function configureCallerSurfacePolling(immediate = false) {
        const shouldPoll = isOwnCallerRuntimeSurface();
        ensureChainSnapshotLoaded();
        if (!state.statusTimer) {
            state.statusTimer = setInterval(() => {
                if (isAttackPage()) return;
                if (isOwnCallerRuntimeSurface()) {
                    expireLocalCalls();
                    refreshMountedStatusTimers();
                }
                refreshMountedChainTimer();
                checkChainAlerts();
            }, STATUS_TICK_MS);
        }
        if (!state.warStatusTimer) {
            state.warStatusTimer = setInterval(() => {
                if (!document.hidden && !isAttackPage() && isOwnWarPage()) {
                    refreshWarStatusFeed().catch(() => { });
                }
            }, WAR_STATUS_REFRESH_MS);
        }
        if (!state.chainStateTimer) state.chainStateTimer = setInterval(() => {
            if (!isAttackPage()) syncChainState();
        }, CHAIN_STATE_POLL_MS);
        if (!state.assistanceTimer) state.assistanceTimer = setInterval(syncAssistanceState, ASSISTANCE_POLL_MS);
        if (!state.heartbeatTimer) state.heartbeatTimer = setInterval(() => {
            if (!isAttackPage()) sendHeartbeat();
        }, HEARTBEAT_MS);
        if (immediate && !isAttackPage()) {
            checkChainAlerts();
            syncChainState();
            syncAssistanceState();
            sendHeartbeat();
            if (isOwnWarPage()) refreshWarStatusFeed(true).catch(() => { });
        }
        if (immediate && isAttackPage()) syncAssistanceState();
        if (!shouldPoll) {
            clearInterval(state.stateTimer);
            state.stateTimer = 0;
            clearInterval(state.callStateTimer);
            state.callStateTimer = 0;
            return false;
        }
        if (!state.stateTimer) state.stateTimer = setInterval(syncState, STATE_POLL_MS);
        if (!state.callStateTimer) state.callStateTimer = setInterval(syncCallState, CALL_STATE_POLL_MS);
        if (immediate && !state.syncInFlight) syncState();
        if (immediate && !state.callStateInFlight) syncCallState();
        return true;
    }

    function hasCallerSurfaceChange(mutation) {
        if (mutation.type !== "childList") return false;
        if (isMessagesPage() || isEventsPage()) return false;
        const changed = [...mutation.addedNodes, ...mutation.removedNodes].filter(node =>
            node instanceof Element
            && !isCallerOwnedNode(node)
            && !node.closest("#chatRoot,#sidebarroot,#sidebar")
        );
        if (!changed.length) return false;
        const utilityFactionTab = isFactionUtilityTabRoute();
        const inlineFactionSurface = isCallerInlineFactionRoute();
        if (!utilityFactionTab && inlineFactionSurface && changed.some(node => containsCallerInlineStatus(node))) {
            state.inlineStatusCard = null;
            state.inlineAnchorLookupAt = 0;
            return true;
        }
        if (!utilityFactionTab && changed.some(node => node.matches(".faction-war") || node.querySelector(".faction-war"))) return true;
        const universalMounted = Boolean(document.querySelector("#emu-war-caller-inline-slot > #emu-war-caller-root.universal-inline"));
        if (!universalMounted && !isAttackPage() && !inlineFactionSurface) {
            const titleSelector = "h1,h2,h3,h4,.content-title,[class*='contentTitle'],[class*='titleContainer'],.title-black";
            if (changed.some(node => node.matches(titleSelector) || node.querySelector(titleSelector))) return true;
        }
        // Once the active war root exists, its scoped observer is the single owner of
        // roster updates. Letting the page-wide observer process the same mutations
        // duplicates scans and can fight Torn's React reconciliation on mobile.
        if (isOwnWarPage()) return false;
        if (isProfileBspPage()) {
            const playerId = currentProfileBspPlayerId();
            const badge = document.querySelector(".emu-caller-profile-bsp-box");
            if (playerId && (!badge || Number(badge.dataset.playerId || 0) !== Number(playerId))) return changed.length > 0;
        }
        if (isCompanyBspPage()) {
            const companySelector = ".user.name,a[href*='profiles.php'],a[href*='XID='],[data-userid],[data-user-id],[data-playerid],[data-player-id],[class*='honor']";
            return changed.some(node =>
                node.matches(companySelector)
                || node.querySelector(companySelector)
                || /\bposition\s*:/i.test(compactText(node))
            );
        }
        if (isHallOfFameBspPage()) {
            const hallOfFameSelector = ".user.name,.honor-text-wrap,[class*='userInfoBox__'],a[href*='profiles.php'],a[href*='XID='],a[href*='userId='],[data-userid],[data-user-id],[data-playerid],[data-player-id]";
            return changed.some(node =>
                node.matches(hallOfFameSelector)
                || node.querySelector(hallOfFameSelector)
            );
        }
        if (isAdvancedSearchBspPage()) {
            const advancedSearchSelector = ".name,.honor-text-wrap,[class*='honorWrap'],a[href*='profiles.php'],a[href*='XID='],[data-userid],[data-user-id],[data-playerid],[data-player-id]";
            return changed.some(node =>
                node.matches(advancedSearchSelector)
                || node.querySelector(advancedSearchSelector)
            );
        }
        if (isRussianRouletteBspPage()) {
            const roulettePlayerSelector = "a[href*='profiles.php'],a[href*='XID='],a[onclick*='profiles.php'],[data-userid],[data-user-id],[data-playerid],[data-player-id],[data-xid]";
            return changed.some(node =>
                node.matches(roulettePlayerSelector)
                || node.querySelector(roulettePlayerSelector)
            );
        }
        if (isExpandedBspListPage()) {
            return changed.some(node =>
                node.matches("a[href*='profiles.php'],a[href*='XID='],[data-userid],[data-user-id],[data-playerid],[data-player-id]")
                || node.querySelector("a[href*='profiles.php'],a[href*='XID='],[data-userid],[data-user-id],[data-playerid],[data-player-id]")
            );
        }
        if (/\/factions\.php/i.test(location.pathname)) {
            if (!isFactionChainRoute() && !isStandardFactionBspPage()) return false;
            const selector = "a[href*='profiles.php'],a[href*='XID='],[data-userid],[data-user-id],[data-playerid],[data-player-id]";
            const factionRoot = ".members-list,[class*='membersList'],[class*='memberList'],[class*='member-list'],[class*='members-list']";
            return changed.some(node => {
                if (!isFactionChainRoute() && !node.closest(factionRoot) && !node.matches(factionRoot) && !node.querySelector(factionRoot)) return false;
                return node.matches(selector) || Boolean(node.querySelector(selector));
            });
        }
        return false;
    }

    function isCallerOwnedNode(node) {
        return node instanceof Element && Boolean(
            node.matches("#emu-war-caller-root,#emu-war-caller-inline-slot,#emu-alliance-chat-root,#emu-alliance-chat-native-tab,#emu-family-chat-root,#emu-family-chat-native-tab,[data-emu-caller-owned-slot='true'],.emu-caller-foreign-war-bsp-badge")
            || node.closest("#emu-war-caller-root,#emu-war-caller-inline-slot,#emu-alliance-chat-root,#emu-alliance-chat-native-tab,#emu-family-chat-root,#emu-family-chat-native-tab,[data-emu-caller-owned-slot='true'],.emu-caller-foreign-war-bsp-badge")
        );
    }

    function recoverRemovedCallerRoot(mutations) {
        if (isForeignActiveRankedWarPage()) return;
        if (!state.panelBuilt || document.getElementById("emu-war-caller-root")) return;
        const removed = mutations.some(mutation => Array.from(mutation.removedNodes || []).some(node =>
            node instanceof Element && (
                node.id === "emu-war-caller-root"
                || Boolean(node.querySelector?.("#emu-war-caller-root"))
            )
        ));
        if (!removed) return;
        recoverCallerRootOnce();
    }

    function captureHallOfFameMutationData(mutations) {
        const found = [];
        const seen = new Set();
        const selector = ".user.name,a[href*='profiles.php'],a[href*='XID='],a[href*='userId='],[data-userid],[data-user-id],[data-playerid],[data-player-id],[data-xid]";
        const remember = node => {
            if (!(node instanceof HTMLElement) || node.closest("#emu-war-caller-root,#emu-caller-hof-diagnostic,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar']")) return;
            const playerId = expandedBspPlayerId(node, node);
            if (!playerId || seen.has(playerId)) return;
            seen.add(playerId);
            const name = compactText(node).replace(/\[\d{3,12}\]/g, "").trim().slice(0, 80);
            found.push({ id: Number(playerId), name });
        };
        for (const mutation of mutations || []) {
            for (const added of mutation.addedNodes || []) {
                if (!(added instanceof HTMLElement)) continue;
                if (added.matches(selector)) remember(added);
                added.querySelectorAll(selector).forEach(remember);
                if (found.length >= 250) break;
            }
            if (found.length >= 250) break;
        }
        if (!found.length) return 0;
        if (found.length >= 3) {
            state.hallOfFameTransientRecords = found;
        } else {
            const combined = [...(state.hallOfFameTransientRecords || []), ...found];
            const unique = [];
            const ids = new Set();
            combined.forEach(record => {
                if (!record?.id || ids.has(record.id)) return;
                ids.add(record.id);
                unique.push(record);
            });
            state.hallOfFameTransientRecords = unique.slice(-250);
        }
        state.hallOfFameRecordSource = "Transient Torn identity nodes";
        return found.length;
    }

    function scanSoon(delay) {
        if (state.sleeping || enterFinishedWarSleep()) return;
        clearTimeout(state.scanTimer);
        state.scanTimer = setTimeout(scanWarRows, Math.max(0, delay || 0));
    }

    function hasHallOfFameRosterMutation(mutation) {
        return Array.from(mutation?.addedNodes || []).some(node => {
            const element = node instanceof Element ? node : node?.parentElement;
            if (!(element instanceof Element) || element.closest(".emu-caller-hof-bsp-injection,#emu-caller-hof-diagnostic")) return false;
            return Boolean(element.matches("tr[class*='tableRow'],tr[role='row']") || element.closest("tr[class*='tableRow'],tr[role='row']") || element.querySelector?.("tr[class*='tableRow'],tr[role='row']"));
        });
    }

    function hasStandardFactionRosterMutation(mutation) {
        const factionRoot = ".members-list,[class*='membersList'],[class*='memberList'],[class*='member-list'],[class*='members-list']";
        const profile = "a[href*='profiles.php'],a[href^='/profiles']";
        return Array.from(mutation?.addedNodes || []).some(node => {
            const element = node instanceof Element ? node : node?.parentElement;
            if (!(element instanceof Element) || element.closest("#emu-war-caller-root,#chatRoot,#sidebarroot,#sidebar,.emu-caller-faction-bsp-cell,.emu-caller-faction-bsp-header")) return false;
            if (element.matches("[data-emu-caller-faction-bsp-row]") || element.closest("[data-emu-caller-faction-bsp-row]")) return false;
            const roster = element.matches(factionRoot) ? element : element.closest(factionRoot) || element.querySelector?.(factionRoot);
            if (!(roster instanceof Element)) return false;
            return element.matches(profile) || Boolean(element.querySelector?.(profile)) || Boolean(roster.querySelector(profile));
        });
    }

    function invalidateHallOfFameView() {
        document.getElementById("emu-caller-hof-diagnostic")?.remove();
        state.pageData.hallOfFame = [];
        state.hallOfFameTransientRecords = [];
        state.hallOfFamePrimeRecords = [];
        state.hallOfFameRecordSource = "";
        state.hallOfFamePrimeRouteKey = "";
        state.hallOfFameBootstrapStartedAt = Date.now();
        state.hallOfFameBootstrapSignature = "";
        state.hallOfFameBootstrapStablePasses = 0;
        hallOfFameReactHosts.clear();
        hallOfFameTableRows().forEach(row => {
            delete row.dataset.emuCallerHofReactPlayerId;
            delete row.dataset.emuCallerHofReactPlayerName;
            delete row.dataset.emuCallerHofReactSignature;
        });
    }

    function scheduleHallOfFameRefreshBurst() {
        [35, 120, 300].forEach(delay => window.setTimeout(() => {
            if (!isHallOfFameBspPage()) return;
            startHallOfFameBspBootstrap();
            void primeHallOfFameCurrentPage();
            scanSoon(0);
        }, delay));
    }

    function bindHallOfFameNavigationRefresh() {
        if (document.documentElement.dataset.emuCallerHofNavigation === "true") return;
        document.documentElement.dataset.emuCallerHofNavigation = "true";
        document.addEventListener("click", event => {
            if (!isHallOfFameBspPage()) return;
            const target = event.target instanceof Element ? event.target : null;
            if (!target || target.closest("tr[class*='tableRow'],tr[role='row'],.emu-caller-hof-bsp-injection,#emu-caller-hof-diagnostic")) return;
            const control = target.closest("a,button,[role='button'],[role='tab'],[aria-selected],[class*='pagination'],[class*='pager'],[class*='category'],[class*='rank']");
            if (!control) return;
            invalidateHallOfFameView();
            scheduleHallOfFameRefreshBurst();
        }, true);
        ["hashchange", "popstate"].forEach(type => window.addEventListener(type, () => {
            if (!isHallOfFameBspPage()) return;
            invalidateHallOfFameView();
            scheduleHallOfFameRefreshBurst();
        }, { passive: true }));
    }

    function startProfileBspBootstrap() {
        if (!isProfileBspPage()) return;
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            if (document.hidden) return;
            const playerId = currentProfileBspPlayerId();
            const badge = document.querySelector(".emu-caller-profile-bsp-box");
            const mountedId = Number(badge?.dataset.playerId || 0);
            const visiblyMounted = badge instanceof HTMLElement && callerProfileHeaderVisible(badge);
            if ((playerId && mountedId === Number(playerId) && visiblyMounted) || Date.now() - startedAt > 15000) {
                window.clearInterval(timer);
                return;
            }
            scanSoon(0);
        }, 500);
    }

    function startCompanyBspBootstrap() {
        if (!isCompanyBspPage()) return;
        scanSoon(0);
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            if (document.hidden) return;
            const visiblyResolved = Array.from(document.querySelectorAll(".emu-caller-company-card-bsp .emu-caller-faction-bsp-value,.emu-caller-faction-bsp-cell")).some(badge => {
                const rect = badge.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && compactText(badge) !== "--";
            });
            if (visiblyResolved || Date.now() - startedAt > 15000) {
                window.clearInterval(timer);
                return;
            }
            scanSoon(0);
        }, 300);
    }

    function startHallOfFameBspBootstrap() {
        if (!isHallOfFameBspPage()) return;
        const reconcile = () => {
            if (state.sleeping || !isHallOfFameBspPage()) {
                window.clearInterval(state.hallOfFameBootstrapTimer);
                state.hallOfFameBootstrapTimer = 0;
                return;
            }
            if (document.hidden) return;
            void primeHallOfFameCurrentPage();
            scanSoon(0);
            const visibleBadges = Array.from(document.querySelectorAll(".emu-caller-hof-bsp-badge")).filter(badge => {
                const rect = badge.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            const resolved = visibleBadges.filter(badge => compactText(badge) !== "--").length;
            const mountedIds = visibleBadges.map(badge => Number(badge.dataset.playerId || 0)).filter(Boolean).join(",");
            const signature = `${hallOfFameApiView()?.key || "waiting"}|${visibleBadges.length}|${resolved}|${mountedIds}`;
            const complete = visibleBadges.length >= 3
                && resolved === visibleBadges.length
                && hasCompleteHallOfFameBspCoverage();
            if (complete && signature === state.hallOfFameBootstrapSignature) state.hallOfFameBootstrapStablePasses += 1;
            else state.hallOfFameBootstrapStablePasses = 0;
            state.hallOfFameBootstrapSignature = signature;
            const expired = Date.now() - Number(state.hallOfFameBootstrapStartedAt || 0) > 30000;
            if (state.hallOfFameBootstrapStablePasses >= 3 || expired) {
                window.clearInterval(state.hallOfFameBootstrapTimer);
                state.hallOfFameBootstrapTimer = 0;
            }
        };
        if (!state.hallOfFameBootstrapTimer) {
            state.hallOfFameBootstrapStartedAt = Date.now();
            state.hallOfFameBootstrapSignature = "";
            state.hallOfFameBootstrapStablePasses = 0;
            state.hallOfFameBootstrapTimer = window.setInterval(reconcile, 400);
        }
        reconcile();
    }

    function startAdvancedSearchBspBootstrap() {
        if (!isAdvancedSearchBspPage()) return;
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            if (state.sleeping || !isAdvancedSearchBspPage()) {
                window.clearInterval(timer);
                return;
            }
            if (document.hidden) return;
            const visiblyMounted = Array.from(document.querySelectorAll(".emu-caller-advanced-search-bsp .emu-caller-faction-bsp-value")).some(badge => {
                const rect = badge.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            if (visiblyMounted || Date.now() - startedAt > 15000) {
                window.clearInterval(timer);
                return;
            }
            scanSoon(0);
        }, 500);
    }

    function clearAdvancedSearchBspMounts() {
        document.querySelectorAll(".emu-caller-advanced-search-bsp").forEach(node => node.remove());
        document.querySelectorAll("[data-emu-caller-advanced-search-bsp-host]").forEach(host => {
            host.removeAttribute("data-emu-caller-advanced-search-bsp-host");
        });
    }

    function invalidateAdvancedSearchView() {
        clearAdvancedSearchBspMounts();
        state.advancedSearchAwaitingPayload = true;
        state.pageData.advancedSearch = [];
        state.advancedSearchPayloadRevision += 1;
        state.advancedSearchRecords = [];
        state.advancedSearchRecordSource = "";
        state.advancedSearchRecordsAt = 0;
        state.advancedSearchRecordsRevision = -1;
    }

    function renderAdvancedSearchBspNow() {
        if (state.sleeping || state.advancedSearchAwaitingPayload || document.hidden || !isAdvancedSearchBspPage()) return false;
        const roster = enhanceAdvancedSearchBspTags();
        if (!roster.length) return false;
        refreshEmuBspStats(roster, false).catch(() => { });
        return true;
    }

    function queueAdvancedSearchRefresh() {
        if (state.advancedSearchRefreshFrame) return;
        state.advancedSearchRefreshFrame = window.requestAnimationFrame(() => {
            state.advancedSearchRefreshFrame = 0;
            renderAdvancedSearchBspNow();
        });
    }

    function scheduleAdvancedSearchRefreshBurst() {
        queueAdvancedSearchRefresh();
        [24, 60, 120, 240, 480].forEach(delay => window.setTimeout(() => {
            if (isAdvancedSearchBspPage()) queueAdvancedSearchRefresh();
        }, delay));
    }

    function bindAdvancedSearchNavigationRefresh() {
        if (document.documentElement.dataset.emuCallerAdvancedSearchNavigation === "true") return;
        document.documentElement.dataset.emuCallerAdvancedSearchNavigation = "true";
        document.addEventListener("click", event => {
            if (!isAdvancedSearchBspPage()) return;
            const target = event.target instanceof Element ? event.target : null;
            const control = target?.closest("a,button,[role='button']");
            if (!(control instanceof HTMLElement) || control.closest("#emu-war-caller-root")) return;
            const label = compactText(control).slice(0, 24);
            const pagination = control.closest("[class*='pagination'],[class*='pager'],[class*='page-number'],[class*='pageNumber'],[class*='pages']");
            if (!pagination && !/^(?:\d{1,3}|next|previous|prev|<|>)$/i.test(label)) return;
            invalidateAdvancedSearchView();
            scheduleAdvancedSearchRefreshBurst();
        }, true);
        ["hashchange", "popstate"].forEach(type => window.addEventListener(type, () => {
            if (!isAdvancedSearchBspPage()) return;
            invalidateAdvancedSearchView();
            scheduleAdvancedSearchRefreshBurst();
        }, { passive: true }));
    }

    function ensureScopedWarObservers() {
        if (state.sleeping || enterFinishedWarSleep()) return;
        const roots = (isOwnWarPage() || isForeignActiveRankedWarPage())
            ? new Set(document.querySelectorAll(".faction-war"))
            : new Set();
        state.warObservers.forEach((observer, root) => {
            if (!root.isConnected || !roots.has(root)) {
                observer.disconnect();
                state.warObservers.delete(root);
            }
        });
        roots.forEach(root => {
            if (state.warObservers.has(root)) return;
            const observer = new MutationObserver(mutations => {
                if (mutations.some(isRelevantWarMutation)) scanSoon(SCAN_DEBOUNCE_MS);
            });
            observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
            state.warObservers.set(root, observer);
        });
    }

    function isRelevantWarMutation(mutation) {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target?.parentElement;
        const ownedSelector = "#emu-war-caller-root,#emu-war-caller-inline-slot,[data-emu-caller-owned-slot='true'],[data-emu-caller-native='true'],.emu-caller-row-tools,.emu-caller-bsp-cell,.emu-caller-native-level,.emu-caller-native-cd,.emu-caller-native-last,.emu-caller-foreign-war-bsp-badge";
        if (target?.closest?.(ownedSelector)) return false;
        if (mutation.type === "attributes") {
            return Boolean(target?.matches?.("a[href*='profiles.php'],a[href^='/profiles'],a[href*='sid=attack'],a[href*='attack.php'],a[href*='loader.php']"));
        }
        if (mutation.type !== "childList") return false;
        const changed = [...mutation.addedNodes, ...mutation.removedNodes].filter(node => node instanceof Element);
        if (!changed.length) return false;
        if (changed.every(node => node.matches?.(ownedSelector) || node.closest?.(ownedSelector))) return false;
        const structuralSelector = ".members-list,.table-body,.table-row,li.enemy,li.your,li[class*='enemy___'],li[class*='your___'],a[href*='profiles.php'],a[href^='/profiles'],a[href*='sid=attack'],a[href*='attack.php'],a[href*='loader.php']";
        return changed.some(node => node.matches?.(structuralSelector) || node.querySelector?.(structuralSelector));
    }

    function bindWarTableDelegation() {
        if (document.documentElement.dataset.emuCallerWarDelegation === "true") return;
        document.documentElement.dataset.emuCallerWarDelegation = "true";
        document.addEventListener("click", event => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;
            // Sort controls are read-only and must continue to work when an approved
            // alliance war is being viewed outside the member's own faction route.
            const sortButton = target.closest("[data-emu-caller-cat-sort]");
            if (sortButton) {
                event.preventDefault();
                toggleCatSort(sortButton.getAttribute("data-emu-caller-cat-side") || "enemy", sortButton.getAttribute("data-emu-caller-cat-sort") || "");
                scanSoon(0);
                return;
            }
            if (isForeignActiveRankedWarPage()) return;
            const attackLink = target.closest("a.emu-caller-native-attack-link");
            if (attackLink instanceof HTMLAnchorElement) {
                // Keep Torn's native same-tab SPA route: forcing a new tab causes a full Torn
                // boot and can lose a freshly available target. Browser modifiers/long-press
                // still provide the normal open-in-new-tab option.
                attackLink.removeAttribute("target");
                attackLink.removeAttribute("rel");
                const row = attackLink.closest("[data-emu-caller-native-player-id]");
                const playerId = Number(row?.getAttribute("data-emu-caller-native-player-id") || 0);
                if (playerId && isOwnCall(state.calls.get(playerId))) saveAttackCallContext(playerId);
                return;
            }
            const warRoot = target.closest(".faction-war");
            if (!warRoot || target.closest(".emu-caller-cat-board")) return;
            const control = target.closest("button,a,[role='tab'],[aria-selected],[data-faction-id],[class*='faction']");
            if (!control) return;
            const side = factionSideFromControl(control, warRoot);
            if (!side) return;
            warRoot.dataset.emuCallerSelectedSide = side;
            clearTimeout(state.factionSwitchTimer);
            scanSoon(0);
            state.factionSwitchTimer = setTimeout(() => scanSoon(0), 180);
        }, true);
    }

    function buildPanel() {
        if (document.getElementById("emu-war-caller-root")) return;
        const root = document.createElement("div");
        root.id = "emu-war-caller-root";
        root.innerHTML = `
      <button type="button" id="emu-war-caller-button" hidden>EMU CALLER</button>
      <section id="emu-war-caller-panel">
        <div class="emu-caller-head">
        <strong>EmuControl Companion <small class="emu-caller-version">v${RUNTIME_VERSION}</small></strong>
          <span id="emu-caller-connection-dot"></span>
          <button type="button" data-emu-close>x</button>
        </div>
        <div class="emu-caller-tabs">
          <button type="button" data-tab="faction">Faction</button>
          <button type="button" data-tab="attacks">Attacks</button>
          <button type="button" data-tab="chain">Chain</button>
          <button type="button" data-tab="settings">Settings</button>
          <button type="button" data-tab="stats">Stats</button>
          <button type="button" class="emu-caller-icon-tab emu-caller-shout-tab" data-tab="announcements" title="Faction announcements" aria-label="Faction announcements"><span aria-hidden="true">&#128227;</span></button>
          <button type="button" class="emu-caller-icon-tab" data-tab="help" title="Information" aria-label="Information"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7h.01"></path></svg></button>
        </div>
        <div id="emu-caller-status"></div>
        <div id="emu-caller-tab-body"></div>
      </section>
    `;
        document.body.appendChild(root);
        const launcher = root.querySelector("#emu-war-caller-button");
        launcher?.addEventListener("click", () => {
            if (Date.now() < state.launcherClickSuppressUntil) return;
            const nextOpen = !getBool(STORAGE.panelOpen, false);
            setBool(STORAGE.panelOpen, nextOpen);
            setBool(STORAGE.universalCollapsed, !nextOpen);
            renderPanel();
        });
        bindMovableLauncher(root, launcher);
        root.querySelector("[data-emu-close]")?.addEventListener("click", () => {
            setBool(STORAGE.panelOpen, false);
            setBool(STORAGE.universalCollapsed, true);
            renderPanel();
        });
        root.querySelectorAll("[data-tab]").forEach(button => {
            button.addEventListener("click", () => {
                state.settingsEditing = false;
                const nextTab = button.dataset.tab || "faction";
                if (root.classList.contains("universal-inline")) {
                    const sameTab = getValue(STORAGE.activeTab, "faction") === nextTab;
                    const nextOpen = !sameTab || !getBool(STORAGE.panelOpen, false);
                    setBool(STORAGE.panelOpen, nextOpen);
                    setBool(STORAGE.universalCollapsed, !nextOpen);
                }
                setValue(STORAGE.activeTab, nextTab);
                renderPanel();
            });
        });
        state.panelBuilt = true;
        renderPanel();
    }

    function renderPanel() {
        if (!state.panelBuilt) return;
        addStyles();
        const attackPage = isAttackPage();
        const foreignWarPage = isForeignActiveRankedWarPage();
        const compactLauncherPage = isCompactCallerLauncherPage();
        const overseasLauncherPage = isOverseasTravelPage();
        let root = document.getElementById("emu-war-caller-root");
        const enteringOverseas = overseasLauncherPage && root?.dataset.emuCallerOverseas !== "true";
        if (root) {
            root.classList.toggle("emu-caller-overseas-launcher", overseasLauncherPage);
            if (overseasLauncherPage) root.dataset.emuCallerOverseas = "true";
            else delete root.dataset.emuCallerOverseas;
        }
        if (enteringOverseas) {
            setBool(STORAGE.panelOpen, false);
            setBool(STORAGE.universalCollapsed, true);
        }
        if (foreignWarPage && root?.parentElement && root.parentElement !== document.body) {
            unmountCallerInlinePanel(root);
            root = document.getElementById("emu-war-caller-root");
        }
        const open = !attackPage && !foreignWarPage && getBool(STORAGE.panelOpen, false);
        const inline = !attackPage && !foreignWarPage && mountCallerInlinePanel();
        root = document.getElementById("emu-war-caller-root");
        if (root) {
            root.hidden = attackPage || foreignWarPage;
            if (!attackPage && !foreignWarPage) root.style.removeProperty("display");
            root.classList.toggle("collapsed", root.classList.contains("universal-inline") && !getBool(STORAGE.panelOpen, false));
        }
        const panel = document.getElementById("emu-war-caller-panel");
        const button = document.getElementById("emu-war-caller-button");
        if (panel) panel.classList.toggle("open", !foreignWarPage && (inline || open));
        if (button) {
            button.hidden = foreignWarPage || inline;
            button.textContent = compactLauncherPage ? "EMU" : "EMU CALLER";
            button.dataset.ready = getApiKey() && getBool(STORAGE.enabled, true) ? "true" : "false";
        }
        let activeTab = getValue(STORAGE.activeTab, "faction");
        if (!["faction", "chain", "attacks", "settings", "stats", "announcements", "help"].includes(activeTab)) {
            activeTab = activeTab === "events" || activeTab === "plan" ? "attacks" : "faction";
            setValue(STORAGE.activeTab, activeTab);
        }
        const panelCollapsed = Boolean(root?.classList.contains("collapsed"));
        document.querySelectorAll("#emu-war-caller-panel [data-tab]").forEach(tab => {
            tab.classList.toggle("active", !panelCollapsed && tab.dataset.tab === activeTab);
        });
        const dot = document.getElementById("emu-caller-connection-dot");
        if (dot) dot.dataset.connected = state.connected ? "true" : "false";
        setText("emu-caller-status", panelStatusText());
        const body = document.getElementById("emu-caller-tab-body");
        if (!body) return;
        const preserveForm = state.settingsEditing && body.dataset.emuCallerTab === activeTab && Boolean(body.querySelector("#emu-caller-api-key,#emu-caller-quick-api-key"));
        const announcementEditor = body.querySelector("[data-announcement-message]");
        const preserveAnnouncementEditor = activeTab === "announcements" && announcementEditor && document.activeElement === announcementEditor;
        const warBriefEditor = body.querySelector("[data-war-brief-message]");
        const preserveWarBriefEditor = activeTab === "faction" && warBriefEditor && document.activeElement === warBriefEditor;
        if (preserveForm || preserveAnnouncementEditor || preserveWarBriefEditor) return;
        let markup = "";
        if (activeTab === "settings") markup = settingsHtml();
        else if (activeTab === "attacks") markup = attacksHtml();
        else if (activeTab === "chain") markup = chainHtml();
        else if (activeTab === "stats") markup = statsHtml();
        else if (activeTab === "announcements") markup = factionAnnouncementComposerHtml(Boolean(getApiKey()));
        else if (activeTab === "help") markup = helpHtml();
        else markup = factionHtml();
        if (state.panelMarkupTab === activeTab && state.panelMarkup === markup) return;
        body.innerHTML = markup;
        state.panelMarkup = markup;
        state.panelMarkupTab = activeTab;
        body.dataset.emuCallerTab = activeTab;
        removeMenuChainStatus(body);
        bindPanelEvents(body);
        if (activeTab === "chain") refreshMountedChainOrder();
        if (activeTab === "faction") loadFactionProfiles();
    }

    function removeMenuChainStatus(root) {
        if (!root) return;
        root.querySelectorAll(".emu-caller-chain-status,.emu-caller-chain-row,[data-emu-chain-status]").forEach(node => node.remove());
        Array.from(root.children).forEach(node => {
            const text = compactText(node.textContent || "");
            if (/^CHAIN\s+Chain:\s*\d+\s*\/\s*\d+/i.test(text) && !node.querySelector("[data-chain-target]")) node.remove();
        });
    }

    function mountCallerInlinePanel() {
        let root = document.getElementById("emu-war-caller-root") || recoverCallerRootOnce();
        if (!root || !document.body) return false;
        if (isForeignActiveRankedWarPage()) return unmountCallerInlinePanel(root);
        if (isAttackPage()) return unmountCallerInlinePanel(root);
        if (isCompactCallerLauncherPage()) return unmountCallerInlinePanel(root);
        // Faction pages share Torn's normal page-title shell. Mount directly below
        // that title so the Companion strip stays above Torn's native faction tabs
        // on every faction subpage and inherits the standard collapse behaviour.
        if (/\/factions\.php$/i.test(String(location.pathname || ""))) return mountCallerOnUniversalPage(root);
        if (!isCallerInlineFactionRoute() || isFactionUtilityTabRoute()) return mountCallerOnUniversalPage(root);

        if (mountCallerAtCatFactionAnchor(root)) return true;

        const card = findCallerInlineStatusCard(root);
        if (!(card instanceof HTMLElement)) {
            const stableSlot = currentCallerInlineSlot();
            if (stableSlot) {
                if (root.parentElement !== stableSlot) stableSlot.appendChild(root);
                root.classList.add("inline");
                root.classList.remove("universal-inline", "collapsed");
                delete root.dataset.emuCallerInlineWaiting;
                root.dataset.emuCallerInlineAnchor = "war-status";
                return true;
            }
            // The mobile faction shell occasionally moves this card outside its usual
            // war containers. Fail open as the floating launcher until it reappears.
            root.classList.remove("inline");
            delete root.dataset.emuCallerInlineWaiting;
            if (root.parentElement !== document.body) document.body.appendChild(root);
            applyStoredLauncherPosition(root);
            return false;
        }

        const slot = ensureCallerInlineSlot(card);
        if (!slot) {
            root.classList.remove("inline");
            delete root.dataset.emuCallerInlineWaiting;
            if (root.parentElement !== document.body) document.body.appendChild(root);
            applyStoredLauncherPosition(root);
            return false;
        }
        if (root.parentElement !== slot) slot.appendChild(root);
        root.classList.add("inline");
        root.classList.remove("universal-inline", "collapsed");
        clearLauncherFloatingStyles(root);
        delete root.dataset.emuCallerInlineWaiting;
        root.dataset.emuCallerInlineAnchor = "war-status";
        return true;
    }

    function recoverCallerRootOnce() {
        const existing = document.getElementById("emu-war-caller-root");
        if (existing) {
            state.inlineRootRecoveryAttempted = false;
            return existing;
        }
        if (!document.body || state.inlineRootRecoveryAttempted) return null;
        state.inlineRootRecoveryAttempted = true;
        state.panelBuilt = false;
        state.panelMarkup = "";
        state.panelMarkupTab = "";
        buildPanel();
        const recovered = document.getElementById("emu-war-caller-root");
        if (recovered) state.inlineRootRecoveryAttempted = false;
        return recovered;
    }

    function unmountCallerInlinePanel(root) {
        state.inlineStatusCard = null;
        state.inlineAnchorLookupAt = 0;
        root.classList.remove("inline", "universal-inline", "collapsed");
        delete root.dataset.emuCallerInlineWaiting;
        delete root.dataset.emuCallerInlineAnchor;
        if (root.parentElement !== document.body) document.body.appendChild(root);
        document.querySelectorAll("#emu-war-caller-inline-slot").forEach(slot => slot.remove());
        state.inlineSlot = null;
        applyStoredLauncherPosition(root);
        return false;
    }

    function mountCallerAtCatFactionAnchor(root) {
        const warList = document.getElementById("faction_war_list_id") || document.querySelector(".f-war-list");
        if (!(warList instanceof HTMLElement) || warList.closest("#emu-war-caller-root,#emu-war-caller-inline-slot")) return false;
        const factionWarInfo = document.querySelector(".faction-war-info,[class*='factionWarInfo']");
        const descWrap = factionWarInfo instanceof HTMLElement
            ? (factionWarInfo.closest(".desc-wrap,[class*='warDesc']") || factionWarInfo.parentElement)
            : null;
        let slot = currentCallerInlineSlot();
        if (!slot) {
            slot = document.createElement("div");
            slot.id = "emu-war-caller-inline-slot";
            slot.dataset.emuCallerOwnedSlot = "true";
        }
        dedupeCallerInlineSlots(slot);
        if (descWrap instanceof HTMLElement && !descWrap.closest(".members-list,.table-body,.table-row,table,tbody,tr")) {
            if (slot.parentElement !== descWrap || descWrap.firstElementChild !== slot) descWrap.prepend(slot);
        } else {
            const parent = warList.parentElement;
            if (!(parent instanceof HTMLElement) || parent.closest(".members-list,.table-body,.table-row,table,tbody,tr")) return false;
            if (slot.parentElement !== parent || slot.previousElementSibling !== warList) warList.insertAdjacentElement("afterend", slot);
        }
        if (root.parentElement !== slot) slot.appendChild(root);
        state.inlineSlot = slot;
        state.inlineStatusCard = null;
        root.classList.add("inline");
        root.classList.remove("universal-inline", "collapsed");
        clearLauncherFloatingStyles(root);
        delete root.dataset.emuCallerInlineWaiting;
        root.dataset.emuCallerInlineAnchor = descWrap ? "cat-desc-wrap" : "cat-war-list";
        return true;
    }

    function mountCallerOnUniversalPage(root) {
        const mountedSlot = currentCallerInlineSlot();
        if (mountedSlot && root.parentElement === mountedSlot && root.dataset.emuCallerInlineAnchor === "page-title") {
            root.classList.add("inline", "universal-inline");
            root.classList.toggle("collapsed", !getBool(STORAGE.panelOpen, false));
            return true;
        }
        const anchor = findUniversalCallerTitleAnchor(root);
        if (!(anchor instanceof HTMLElement) || !(anchor.parentElement instanceof HTMLElement)) return unmountCallerInlinePanel(root);
        let slot = currentCallerInlineSlot();
        if (!slot) {
            slot = document.createElement("div");
            slot.id = "emu-war-caller-inline-slot";
            slot.dataset.emuCallerOwnedSlot = "true";
        }
        dedupeCallerInlineSlots(slot);
        if (slot.parentElement !== anchor.parentElement || slot.previousElementSibling !== anchor) {
            anchor.insertAdjacentElement("afterend", slot);
        }
        if (root.parentElement !== slot) slot.appendChild(root);
        state.inlineSlot = slot;
        state.inlineStatusCard = null;
        root.classList.add("inline", "universal-inline");
        root.classList.toggle("collapsed", !getBool(STORAGE.panelOpen, false));
        clearLauncherFloatingStyles(root);
        delete root.dataset.emuCallerInlineWaiting;
        root.dataset.emuCallerInlineAnchor = "page-title";
        document.getElementById("emu-war-caller-panel")?.classList.add("open");
        const button = document.getElementById("emu-war-caller-button");
        if (button) button.hidden = true;
        return true;
    }

    function findUniversalCallerTitleAnchor(root) {
        const selectors = [
            "#mainContainer .content-title",
            "#mainContainer [class*='contentTitle']",
            "#mainContainer [class*='titleContainer']",
            "#mainContainer .title-black",
            "#mainContainer h1",
            "#mainContainer h2",
            "#mainContainer h3",
            "#mainContainer h4",
            "main .content-title",
            "main [class*='contentTitle']",
            "main [class*='titleContainer']",
            "main h1",
            "main h2",
            "main h3",
            "main h4",
            "[role='main'] h1",
            "[role='main'] h2",
            "[role='main'] h3",
            "[role='main'] h4"
        ];
        const candidates = Array.from(document.querySelectorAll(selectors.join(",")));
        for (const candidate of candidates) {
            if (!(candidate instanceof HTMLElement) || candidate === root || candidate.closest("#emu-war-caller-root,#emu-war-caller-inline-slot,#chatRoot,#sidebarroot,#sidebar,nav,table,tbody,tr")) continue;
            if (!candidate.closest("#mainContainer,main,[role='main'],.content-wrapper,.contentWrapper,[class*='contentWrapper']")) continue;
            const text = callerInlineText(candidate);
            if (!text || text.length > 140 || !isVisibleCallerInlineElement(candidate)) continue;
            const container = candidate.closest(".content-title,[class*='contentTitle'],[class*='titleContainer'],.title-black") || candidate;
            if (!(container instanceof HTMLElement) || container.parentElement === document.body) continue;
            const rect = container.getBoundingClientRect();
            if (rect.width < 120 || rect.height < 8 || rect.height > 180) continue;
            return container;
        }
        return null;
    }

    function bindMovableLauncher(root, button) {
        if (!(root instanceof HTMLElement) || !(button instanceof HTMLElement)) return;
        [button, root.querySelector(".emu-caller-head")].filter(handle => handle instanceof HTMLElement).forEach(handle => {
            if (handle.dataset.emuCallerDragBound === "true") return;
            handle.dataset.emuCallerDragBound = "true";
            let drag = null;
            handle.addEventListener("pointerdown", event => {
                if (root.classList.contains("inline") || root.classList.contains("emu-caller-overseas-launcher") || (Number.isFinite(event.button) && event.button > 0)) return;
                if (handle !== button && event.target.closest("button,a,input,textarea,select")) return;
                const rect = root.getBoundingClientRect();
                drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, moved: false };
                try { handle.setPointerCapture(event.pointerId); } catch (err) { }
            });
            handle.addEventListener("pointermove", event => {
                if (!drag || event.pointerId !== drag.pointerId) return;
                const dx = event.clientX - drag.startX;
                const dy = event.clientY - drag.startY;
                if (!drag.moved && Math.hypot(dx, dy) < 4) return;
                drag.moved = true;
                root.dataset.emuCallerDragging = "true";
                setLauncherFloatingPosition(root, drag.left + dx, drag.top + dy);
                if (event.cancelable) event.preventDefault();
            });
            const finishDrag = event => {
                if (!drag || event.pointerId !== drag.pointerId) return;
                const moved = drag.moved;
                drag = null;
                delete root.dataset.emuCallerDragging;
                try { handle.releasePointerCapture(event.pointerId); } catch (err) { }
                if (!moved) return;
                state.launcherClickSuppressUntil = Date.now() + 450;
                const rect = root.getBoundingClientRect();
                setValue(STORAGE.launcherPosition, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
                if (event.cancelable) event.preventDefault();
            };
            handle.addEventListener("pointerup", finishDrag);
            handle.addEventListener("pointercancel", finishDrag);
        });
        if (!state.launcherDragBound) {
            state.launcherDragBound = true;
            window.addEventListener("resize", () => {
                const current = document.getElementById("emu-war-caller-root");
                if (current && !current.classList.contains("inline")) applyStoredLauncherPosition(current);
            }, { passive: true });
        }
        applyStoredLauncherPosition(root);
    }

    function clearLauncherFloatingStyles(root) {
        if (!(root instanceof HTMLElement)) return;
        root.classList.remove("launcher-positioned");
        ["left", "top", "right", "bottom"].forEach(property => root.style.removeProperty(property));
    }

    function setLauncherFloatingPosition(root, left, top) {
        if (!(root instanceof HTMLElement) || root.classList.contains("inline") || root.classList.contains("emu-caller-overseas-launcher")) return;
        const rect = root.getBoundingClientRect();
        const width = Math.min(Math.max(rect.width || 90, 70), Math.max(70, window.innerWidth - 8));
        const height = Math.min(Math.max(rect.height || 30, 30), Math.max(30, window.innerHeight - 8));
        const nextLeft = Math.max(4, Math.min(Number(left) || 4, Math.max(4, window.innerWidth - width - 4)));
        const nextTop = Math.max(4, Math.min(Number(top) || 4, Math.max(4, window.innerHeight - height - 4)));
        root.classList.add("launcher-positioned");
        root.style.setProperty("left", `${Math.round(nextLeft)}px`);
        root.style.setProperty("top", `${Math.round(nextTop)}px`);
        root.style.setProperty("right", "auto");
        root.style.setProperty("bottom", "auto");
    }

    function applyStoredLauncherPosition(root) {
        if (!(root instanceof HTMLElement)) return;
        if (root.classList.contains("emu-caller-overseas-launcher")) {
            clearLauncherFloatingStyles(root);
            return;
        }
        if (root.classList.contains("inline")) {
            clearLauncherFloatingStyles(root);
            return;
        }
        const raw = getValue(STORAGE.launcherPosition, "");
        if (!raw) return;
        try {
            const position = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (Number.isFinite(Number(position?.left)) && Number.isFinite(Number(position?.top))) {
                setLauncherFloatingPosition(root, Number(position.left), Number(position.top));
            }
        } catch (err) { }
    }

    function currentCallerInlineSlot() {
        const slot = state.inlineSlot instanceof HTMLElement
            ? state.inlineSlot
            : document.getElementById("emu-war-caller-inline-slot");
        if (!(slot instanceof HTMLElement) || !slot.isConnected) return null;
        if (slot.closest(".members-list,.table-body,.table-row,table,tbody,tr,[class*='membersList'],[class*='members-list']")) return null;
        state.inlineSlot = slot;
        return slot;
    }

    function ensureCallerInlineSlot(card) {
        if (!isSafeCallerInlineCard(card)) return null;
        let slot = currentCallerInlineSlot();
        if (!slot) {
            slot = document.createElement("div");
            slot.id = "emu-war-caller-inline-slot";
            slot.dataset.emuCallerOwnedSlot = "true";
        }
        dedupeCallerInlineSlots(slot);
        if (slot.parentElement !== card.parentElement || slot.previousElementSibling !== card) {
            card.insertAdjacentElement("afterend", slot);
        }
        state.inlineSlot = slot;
        state.inlineStatusCard = card;
        return slot;
    }

    function dedupeCallerInlineSlots(keep) {
        const root = document.getElementById("emu-war-caller-root");
        document.querySelectorAll("#emu-war-caller-inline-slot").forEach(slot => {
            if (slot === keep) return;
            if (root && slot.contains(root)) (keep || document.body).appendChild(root);
            slot.remove();
        });
    }

    function isCallerInlineFactionRoute() {
        const path = String(location.pathname || "");
        if (/\/factions\.php$/i.test(path)) {
            let params;
            try {
                params = new URL(location.href).searchParams;
            } catch (err) {
                params = new URLSearchParams(location.search || "");
            }
            const viewedFactionId = Number(params.get("ID") || params.get("id") || 0);
            const ownFactionId = Number(state.faction?.id || state.faction?.faction_id || 0);
            if (viewedFactionId) return Boolean(ownFactionId && viewedFactionId === ownFactionId);
            const step = String(params.get("step") || "").toLowerCase();
            return !step || step === "your";
        }
        // On war.php, positive foreign-war identity evidence suppresses the caller.
        // Ambiguous loading states remain eligible for one auth bootstrap, then the
        // ownership predicate below reclassifies the surface.
        return /\/war\.php$/i.test(path) && !isForeignActiveRankedWarPage();
    }

    function containsCallerInlineStatus(node) {
        if (!(node instanceof Element) || node.id === "emu-war-caller-root") return false;
        const text = callerInlineText(node);
        return CALLER_INLINE_STATUS_PATTERN.test(text)
            || (CALLER_INLINE_ACTIVE_WAR_PATTERN.test(text) && /\bvs\.?\b/i.test(text));
    }

    function callerInlineText(node) {
        if (!(node instanceof Element)) return "";
        const rendered = typeof node.innerText === "string" ? node.innerText : "";
        return compactText(rendered || node.textContent || "");
    }

    function findCallerInlineStatusCard(root) {
        const cached = state.inlineStatusCard;
        if (
            cached instanceof HTMLElement
            && cached.isConnected
            && cached !== root
            && !cached.contains(root)
            && isSafeCallerInlineCard(cached)
        ) return cached;

        state.inlineStatusCard = null;
        const now = Date.now();
        if (state.inlineAnchorLookupAt && now - state.inlineAnchorLookupAt < 1200) return null;
        state.inlineAnchorLookupAt = now;
        const matches = [];
        const scopes = Array.from(document.querySelectorAll([
            "#faction_war_list_id",
            ".faction-war",
            "[class*='rankedWar']",
            "[class*='ranked-war']",
            "[class*='warStatus']",
            "[class*='war-status']",
            "[class*='warList']",
            "[class*='war-list']",
            "#mainContainer",
            "#main-container",
            "main",
            "[role='main']",
            ".content-wrapper",
            ".contentWrapper",
            "[class*='contentWrapper']",
            "[class*='content-wrapper']"
        ].join(","))).slice(0, 30);
        if (!scopes.length && document.body) scopes.push(document.body);
        const seen = new Set();
        for (const scope of scopes) {
            if (!(scope instanceof HTMLElement) || scope.closest("#emu-war-caller-root,#emu-war-caller-inline-slot")) continue;
            const candidates = [scope, ...Array.from(scope.querySelectorAll("div,section,article,header,li,h1,h2,h3,h4,strong,span")).slice(0, 800)];
            for (const element of candidates) {
                if (
                    !(element instanceof HTMLElement)
                    || seen.has(element)
                    || element.closest("#emu-war-caller-root,#emu-war-caller-inline-slot,#chatRoot,#sidebarroot,#sidebar")
                ) continue;
                seen.add(element);
                const rawText = compactText(element.textContent || "");
                if (!CALLER_INLINE_STATUS_PATTERN.test(rawText)
                    && !(CALLER_INLINE_ACTIVE_WAR_PATTERN.test(rawText) && /\bvs\.?\b/i.test(rawText))) continue;
                if (!isVisibleCallerInlineElement(element)) continue;
                const text = callerInlineText(element);
                if (CALLER_INLINE_STATUS_PATTERN.test(text)
                    || (CALLER_INLINE_ACTIVE_WAR_PATTERN.test(text) && /\bvs\.?\b/i.test(text))) matches.push(element);
            }
        }
        if (!matches.length) collectGlobalCallerInlineMatches(matches, seen);

        const cards = Array.from(new Set(matches
            .map(normalizeCallerInlineStatusCard)
            .filter(card => card instanceof HTMLElement && isSafeCallerInlineCard(card))));
        const visualCards = cards.filter(card => card.id !== "faction_war_list_id");
        const card = (visualCards.length ? visualCards : cards)
            .sort((left, right) => callerInlineText(left).length - callerInlineText(right).length)[0] || null;
        if (card) state.inlineStatusCard = card;
        return card;
    }

    function collectGlobalCallerInlineMatches(matches, seen) {
        if (!document.body || typeof document.createTreeWalker !== "function") return;
        const walker = document.createTreeWalker(document.body, window.NodeFilter?.SHOW_TEXT || 4);
        let scanned = 0;
        let textNode;
        while ((textNode = walker.nextNode()) && scanned < 20000) {
            scanned += 1;
            const raw = compactText(textNode.nodeValue || "");
            if (!/your\s+faction|lead\s+target|in\s+a\s+war/i.test(raw)) continue;
            let element = textNode.parentElement;
            for (let depth = 0; element instanceof HTMLElement && depth < 9; depth += 1, element = element.parentElement) {
                if (element.closest("#emu-war-caller-root,#emu-war-caller-inline-slot,#chatRoot,#sidebarroot,#sidebar")) break;
                const text = compactText(element.textContent || "");
                const matchesStatus = CALLER_INLINE_STATUS_PATTERN.test(text)
                    || (CALLER_INLINE_ACTIVE_WAR_PATTERN.test(text) && /\bvs\.?\b/i.test(text));
                if (matchesStatus) {
                    if (!seen.has(element) && isVisibleCallerInlineElement(element)) {
                        seen.add(element);
                        matches.push(element);
                    }
                    break;
                }
                if (element.matches("main,[role='main'],#mainContainer,#main-container,.content-wrapper,.contentWrapper")) break;
            }
        }
    }

    function isVisibleCallerInlineElement(element) {
        if (!(element instanceof HTMLElement) || !element.isConnected || element.hidden) return false;
        if (!element.getClientRects().length) return false;
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
    }

    function normalizeCallerInlineStatusCard(start) {
        let card = start instanceof HTMLElement ? start : null;
        if (!card) return null;
        for (let depth = 0; depth < 7; depth += 1) {
            const parent = card.parentElement;
            if (!(parent instanceof HTMLElement) || parent === document.body || parent.id === "emu-war-caller-root") break;
            if (parent.matches("main,[role='main'],#mainContainer,#main-container,.content-wrapper,.contentWrapper")) break;
            if (parent.id === "faction_war_list_id" && card.matches("section,article,header,div,li")) break;
            if (parent.querySelector(".members-list,.table-body,[class*='membersList'],[class*='members-list']")) break;
            const text = callerInlineText(parent);
            if (!CALLER_INLINE_STATUS_PATTERN.test(text)
                && !(CALLER_INLINE_ACTIVE_WAR_PATTERN.test(text) && /\bvs\.?\b/i.test(text))) break;
            const rect = parent.getBoundingClientRect();
            if (rect.height > 420) break;
            card = parent;
        }

        return card;
    }

    function isSafeCallerInlineCard(card) {
        if (!(card instanceof HTMLElement) || !card.isConnected) return false;
        if (!isVisibleCallerInlineElement(card)) return false;
        if (card.matches(".members-list,.table-body,.table-row,table,tbody,tr,[class*='membersList'],[class*='members-list']")) return false;
        if (card.closest(".members-list,.table-body,.table-row,table,tbody,tr,[class*='membersList'],[class*='members-list']")) return false;
        if (!(card.parentElement instanceof HTMLElement)
            || card.parentElement.closest(".members-list,.table-body,.table-row,table,tbody,tr,[class*='membersList'],[class*='members-list']")) return false;
        return containsCallerInlineStatus(card);
    }

    function panelStatusText() {
        if (!getBool(STORAGE.enabled, true)) return "Disabled.";
        if (!getApiKey()) return "Create or paste a Custom or Full Access Torn API key below.";
        if (state.lastError) return state.lastError;
        if (state.bspError) return `${state.connected ? "Connected. " : ""}${state.bspError}`;
        if (!isOwnWarPage() && !Number(state.warOpponent?.id || 0)) return "Finding your active faction war...";
        return state.connected ? "Connected. Calls sync every few seconds." : "Connecting...";
    }

    function factionHtml() {
        const refs = detectWarFactionRefs();
        const favoriteCount = readFavoriteTargets().length;
        return `
      ${getApiKey() ? "" : quickApiHtml()}
      ${warBriefHtml()}
      ${warModeCardHtml()}
      <div class="emu-caller-faction-pair">
        ${factionCardHtml("Enemy Faction", refs.enemy, "enemy")}
        ${factionCardHtml("Your Faction", refs.own, "own")}
      </div>
      ${factionComparisonHtml(refs)}
      <div class="emu-caller-actions">
        <button type="button" data-open-war-room>Open War Room</button>
        <button type="button" data-chain-target>Chain target</button>
        <button type="button" data-favourite-target>Pinned target${favoriteCount ? ` (${favoriteCount})` : ""}</button>
        <button type="button" data-sync-now>Refresh</button>
      </div>
    `;
    }

    function warBriefHtml() {
        const brief = state.warBrief && typeof state.warBrief === "object" ? state.warBrief : null;
        const canManage = Boolean(getApiKey() && state.announcementPermissionKnown && state.canAnnounce);
        const draft = state.warBriefEditing
            ? state.warBriefDraft
            : String(state.warBriefDraft || brief?.message || "");
        const current = brief
            ? `<div class="emu-caller-war-brief-current"><strong>${escapeHtml(brief.message || "")}</strong><small>Updated by ${escapeHtml(brief.senderName || "Faction admin")} ${timeAgo(brief.updated_at || brief.created_at)}</small></div>`
            : `<div class="emu-caller-war-brief-empty">No active war brief.</div>`;
        if (!canManage) {
            return `<section class="emu-caller-war-brief"><div class="emu-caller-war-brief-head"><span>War brief</span><small>Stays until the ranked war ends</small></div>${current}</section>`;
        }
        const waitingForWar = !state.activeRankedWarId;
        return `<section class="emu-caller-war-brief"><div class="emu-caller-war-brief-head"><span>War brief</span><small>Faction admin control</small></div>${current}<div class="emu-caller-war-brief-editor"><textarea data-war-brief-message maxlength="${WAR_BRIEF_MAX_LENGTH}" placeholder="Add terms, target scores, priorities, or other standing war orders...">${escapeHtml(draft)}</textarea><div class="emu-caller-actions"><button type="button" data-save-war-brief ${state.warBriefPending || waitingForWar ? "disabled" : ""}>${state.warBriefPending ? "Saving..." : "Update brief"}</button>${brief ? `<button type="button" data-clear-war-brief ${state.warBriefPending ? "disabled" : ""}>Clear brief</button>` : ""}</div><small>${waitingForWar ? "Finding the active ranked war..." : "Every revision sends members one update notification."}</small></div></section>`;
    }

    function warModeCardHtml() {
        const control = state.warControl && typeof state.warControl === "object" ? state.warControl : null;
        const war = state.activeRankedWar && typeof state.activeRankedWar === "object" ? state.activeRankedWar : null;
        if (!control || !state.activeRankedWarId || !war) return "";
        if (control.mode !== "term") {
            return `<section class="emu-caller-war-mode-card real"><div class="emu-caller-war-mode-head"><span>Real war</span><strong>LIVE</strong></div><h3>Real war! Stack up and turn revives off now!</h3><p>Follow the War Brief and be ready to attack. This is not a termed war.</p></section>`;
        }

        const ownCap = Math.max(0, Number(control.own_term_cap || control.term_own_target || 0));
        const enemyCap = Math.max(0, Number(control.enemy_term_cap || control.term_enemy_target || 0));
        return `<section class="emu-caller-war-mode-card term"><div class="emu-caller-war-mode-head"><span>Termed war</span><strong>TERMS SET ON WEBSITE</strong></div><h3>Termed war goals</h3><p>Stop at the configured score unless the War Brief says otherwise.</p>${warModeGoalHtml(war.own?.name || "Our faction", Number(war.own?.score || 0), ownCap)}${warModeGoalHtml(war.enemy?.name || "Enemy faction", Number(war.enemy?.score || 0), enemyCap)}</section>`;
    }

    function warModeGoalHtml(name, score, cap) {
        const safeScore = Math.max(0, Number(score || 0));
        const safeCap = Math.max(0, Number(cap || 0));
        const pct = safeCap > 0 ? Math.min(100, (safeScore / safeCap) * 100) : 0;
        const right = safeCap > 0
            ? (safeScore >= safeCap ? "Goal reached" : `${formatWarModeScore(safeCap - safeScore)} needed`)
            : "Cap not set";
        return `<div class="emu-caller-war-mode-goal"><div><span>${escapeHtml(name)}</span><strong>${safeCap > 0 ? `Max ${formatWarModeScore(safeCap)}` : "Cap not set"}</strong></div><div class="emu-caller-war-mode-track"><i style="width:${pct.toFixed(2)}%"></i></div><div><small>${formatWarModeScore(safeScore)} pts (${pct.toFixed(1)}%)</small><small>${right}</small></div></div>`;
    }

    function formatWarModeScore(value) {
        return Math.max(0, Number(value || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 });
    }

    function factionComparisonHtml(refs) {
        const own = factionSnapshot(state.factionProfiles.get(Number(refs?.own?.id)) || {}, refs?.own, "own");
        const enemy = factionSnapshot(state.factionProfiles.get(Number(refs?.enemy?.id)) || {}, refs?.enemy, "enemy");
        if (!Number(refs?.enemy?.id)) return `<div class="emu-caller-faction-comparison"><strong>No active ranked-war opponent found.</strong><span>Open this tab during a ranked war to load the live comparison.</span></div>`;
        if (!own.knownTotal || !enemy.knownTotal) return `<div class="emu-caller-faction-comparison"><strong>Building the battle-stat comparison...</strong><span>Known estimates and live faction status will fill in as they load.</span></div>`;
        const leader = own.knownTotal >= enemy.knownTotal ? own : enemy;
        const trailer = leader === own ? enemy : own;
        const ratio = trailer.knownTotal > 0 ? leader.knownTotal / trailer.knownTotal : 0;
        return `<div class="emu-caller-faction-comparison"><strong>${escapeHtml(leader.name)} leads known battle stats${ratio ? ` by ${ratio.toFixed(2)}x` : ""}.</strong><span>Coverage ${own.coverage} for ${escapeHtml(own.name)} and ${enemy.coverage} for ${escapeHtml(enemy.name)}. Estimates only; unknown members are excluded.</span></div>`;
    }

    function detectWarFactionRefs() {
        const ownId = Number(state.faction?.id || state.faction?.faction_id || 0);
        const ownName = String(state.faction?.name || "Your faction").trim();
        const refs = [];
        const addRef = (id, name = "") => {
            id = Number(id);
            if (!Number.isFinite(id) || id <= 0 || refs.some(ref => ref.id === id)) return;
            refs.push({ id, name: cleanName(name || "") });
        };
        addRef(state.warOpponent?.id, state.warOpponent?.name);
        document.querySelectorAll([
            ".faction-war a[href*='factions.php']",
            ".faction-war a[href*='/factions/']",
            ".faction-war [data-faction-id]",
            ".faction-war [data-factionid]",
            "[class*='ranked-war'] a[href*='factions.php']",
            "[class*='ranked-war'] a[href*='/factions/']",
            "[class*='ranked-war'] [data-faction-id]",
            "[class*='ranked-war'] [data-factionid]"
        ].join(",")).forEach(node => {
            const raw = String(node.getAttribute("href") || node.getAttribute("data-faction-id") || node.getAttribute("data-factionid") || "");
            const match = raw.match(/[?&](?:ID|id|factionID|factionId|faction_id)=(\d+)/i)
                || raw.match(/\/factions\/(\d+)/i)
                || raw.match(/^(\d+)$/);
            addRef(match?.[1], node.textContent || node.getAttribute("title") || "");
        });
        pageDataFactionRefs().forEach(ref => addRef(ref.id, ref.name));
        let enemy = refs.find(ref => ref.id !== ownId) || { id: 0, name: "Enemy faction" };
        const heading = Array.from(document.querySelectorAll(".faction-war h1,.faction-war h2,.faction-war h3,.faction-war [class*='title']"))
            .map(node => compactText(node.textContent || ""))
            .find(text => /\s+vs\.?\s+/i.test(text));
        if (heading) {
            const names = heading.split(/\s+vs\.?\s+/i).map(cleanName).filter(Boolean);
            const inferred = names.find(name => name.toLowerCase() !== ownName.toLowerCase());
            if (inferred && (!enemy.name || enemy.name === "Enemy faction")) enemy = { ...enemy, name: inferred };
        }
        return { own: { id: ownId, name: ownName }, enemy };
    }

    function pageDataFactionRefs() {
        const refs = [];
        const seen = new Set();
        let visited = 0;
        const add = (id, name = "") => {
            id = Number(id);
            if (!Number.isFinite(id) || id <= 0 || refs.some(ref => ref.id === id)) return;
            refs.push({ id, name: cleanName(name || "") });
        };
        const visit = (value, context = "", depth = 0) => {
            if (!value || typeof value !== "object" || depth > 7 || visited > 2500 || seen.has(value)) return;
            seen.add(value);
            visited += 1;
            if (/faction/i.test(context) && !Array.isArray(value)) {
                add(
                    value.faction_id ?? value.factionId ?? value.factionID ?? value.ID ?? value.id,
                    value.faction_name ?? value.factionName ?? value.name ?? value.title
                );
            }
            Object.entries(value).forEach(([key, child]) => {
                const normalized = key.replace(/[^a-z]/gi, "").toLowerCase();
                if (/^(?:enemy|opponent|own|your|user)?factionid$/.test(normalized) && typeof child !== "object") {
                    const nameKey = key.replace(/id$/i, "name");
                    add(child, value[nameKey] ?? value.faction_name ?? value.factionName ?? "");
                }
                if (child && typeof child === "object") visit(child, `${context}.${key}`, depth + 1);
            });
        };
        visit(state.pageData, "pageData");
        return refs;
    }

    function factionStatusMembers(payload) {
        const raw = payload?.members || payload?.faction?.members || payload;
        if (Array.isArray(raw)) return raw.filter(member => member && typeof member === "object");
        if (!raw || typeof raw !== "object") return [];
        return Object.entries(raw).map(([key, member]) => ({ id: member?.id || member?.player_id || member?.playerId || member?.user_id || member?.userId || member?.member_id || member?.memberId || key, ...(member || {}) }));
    }

    function warStatusMetaFor(id, fallback = {}) {
        return { ...(fallback || {}), ...(state.warStatusById.get(Number(id)) || {}) };
    }

    async function refreshWarStatusFeed(force = false) {
        if (state.sleeping || enterFinishedWarSleep()) return;
        if (!getApiKey()) return;
        const sources = warStatusSources();
        if (!sources.length) return;
        let changed = false;
        await Promise.all(sources.map(async source => {
            const factionId = Number(source.factionId || 0);
            const rosterKey = source.playerIds.slice().sort((a, b) => a - b).join(",");
            const fetchedAt = Number(state.warStatusFetchedAt.get(factionId) || 0);
            if (!force && fetchedAt > Date.now() - WAR_STATUS_REFRESH_MS && state.warStatusRosterKey.get(factionId) === rosterKey) return;
            if (state.warStatusPending.has(factionId)) return;
            state.warStatusPending.add(factionId);
            try {
                const params = new URLSearchParams();
                if (source.playerIds.length) params.set("players", source.playerIds.slice(0, 150).join(","));
                params.set("bsp", "0");
                params.set("war_id", state.warId || detectWarId());
                const payload = await apiRequest(`/api/war-enhancer/faction/${factionId}?${params.toString()}`, null, "GET");
                const next = new Map();
                factionStatusMembers(payload).forEach(member => {
                    const id = Number(member?.id || member?.player_id || member?.playerId || member?.user_id || member?.userId || member?.member_id || member?.memberId || 0);
                    if (!Number.isFinite(id) || id <= 0) return;
                    mergeTargetMeta(next, id, member);
                    next.set(id, { ...(next.get(id) || {}), _factionId: factionId });
                });
                if (!next.size) return;
                Array.from(state.warStatusById.entries()).forEach(([id, meta]) => {
                    if (Number(meta?._factionId || 0) === factionId) state.warStatusById.delete(id);
                });
                next.forEach((meta, id) => state.warStatusById.set(id, meta));
                state.warStatusFetchedAt.set(factionId, Date.now());
                state.warStatusRosterKey.set(factionId, rosterKey);
                changed = true;
            } catch (err) {
                // Keep the last saved timer snapshot when the dashboard feed is temporarily unavailable.
            } finally {
                state.warStatusPending.delete(factionId);
            }
        }));
        if (!changed) return;
        saveWarStatusCache();
        state.targetMetaRevision += 1;
        refreshMountedWarRowsOrScan();
    }

    function warStatusSources() {
        const refs = detectWarFactionRefs();
        const lists = Array.from(document.querySelectorAll(".faction-war .members-list"));
        const sources = new Map();
        const add = (factionId, playerIds = []) => {
            factionId = Number(factionId);
            if (!Number.isFinite(factionId) || factionId <= 0) return;
            const source = sources.get(factionId) || { factionId, playerIds: [] };
            const seen = new Set(source.playerIds);
            playerIds.forEach(id => {
                id = Number(id);
                if (Number.isFinite(id) && id > 0 && !seen.has(id)) {
                    seen.add(id);
                    source.playerIds.push(id);
                }
            });
            sources.set(factionId, source);
        };
        lists.forEach((list, index) => {
            const container = list.closest(".enemy-faction,.your-faction,[class*='enemy-faction'],[class*='your-faction']");
            const classes = String(container?.className || "").toLowerCase();
            const fallbackId = classes.includes("your-faction")
                ? Number(refs.own?.id || 0)
                : classes.includes("enemy-faction")
                    ? Number(refs.enemy?.id || 0)
                    : Number((index === 0 ? refs.enemy : refs.own)?.id || 0);
            add(factionIdForWarList(list) || fallbackId, playerIdsForWarList(list));
        });
        add(refs.own?.id, []);
        add(refs.enemy?.id, []);
        return Array.from(sources.values());
    }

    function playerIdsForWarList(list) {
        const ids = [];
        const seen = new Set();
        list.querySelectorAll("a[href*='profiles.php'],a[href^='/profiles']").forEach(anchor => {
            const id = extractPlayerId(anchor.href || "");
            if (id && !seen.has(id)) {
                seen.add(id);
                ids.push(id);
            }
        });
        return ids;
    }

    function factionIdForWarList(list) {
        const direct = factionIdFromWarNode(list);
        if (direct) return direct;
        let node = list;
        for (let depth = 0; node && depth < 8; depth += 1) {
            const previousId = factionIdFromWarNode(node.previousElementSibling);
            if (previousId) return previousId;
            const parent = node.parentElement;
            const parentPreviousId = factionIdFromWarNode(parent?.previousElementSibling);
            if (parentPreviousId) return parentPreviousId;
            const parentId = depth < 3 ? factionIdFromWarNode(parent) : 0;
            if (parentId) return parentId;
            node = parent;
        }
        return 0;
    }

    function factionIdFromWarNode(node) {
        if (!node?.querySelectorAll) return 0;
        const candidates = [node, ...node.querySelectorAll("a[href*='factions.php'],a[href*='/factions/'],[data-faction-id],[data-factionid]")];
        for (const candidate of candidates) {
            const raw = String(candidate.getAttribute?.("href") || candidate.getAttribute?.("data-faction-id") || candidate.getAttribute?.("data-factionid") || "");
            const match = raw.match(/[?&](?:ID|id|factionID|factionId|faction_id)=(\d+)/i) || raw.match(/\/factions\/(\d+)/i) || raw.match(/^(\d+)$/);
            if (match) return Number(match[1]);
        }
        return 0;
    }

    function factionCardHtml(title, ref, tone) {
        const profile = state.factionProfiles.get(Number(ref?.id)) || {};
        const snapshot = factionSnapshot(profile, ref, tone);
        const name = snapshot.name;
        const leader = factionPerson(profile.leader || profile.leader_name || profile.leader_id, profile);
        const coLeader = factionPerson(profile.co_leader || profile.coleader || profile.co_leader_name || profile.co_leader_id, profile);
        return `<section class="emu-caller-faction-card ${tone}">
      <h3>${escapeHtml(title)}</h3>
      <div class="emu-caller-faction-name"><span>Faction</span><strong>${escapeHtml(name)}</strong></div>
      <div class="emu-caller-leadership"><span>Leadership</span><b>Leader: ${escapeHtml(leader)}</b><b>Co-Leader: ${escapeHtml(coLeader)}</b></div>
      <div class="emu-caller-faction-facts"><div><span>Members</span><strong>${escapeHtml(snapshot.members)}</strong></div><div><span>Online now</span><strong>${escapeHtml(snapshot.online)}</strong></div><div><span>Known BSP</span><strong>${escapeHtml(snapshot.knownTotalLabel)}</strong></div><div><span>Coverage</span><strong>${escapeHtml(snapshot.coverage)}</strong></div><div><span>AVG KNOWN</span><strong>${escapeHtml(snapshot.averageLabel)}</strong></div><div class="wide"><span>Strongest known</span><strong>${escapeHtml(snapshot.strongest)}</strong></div><div><span>Data freshness</span><strong>${escapeHtml(snapshot.freshness)}</strong></div></div>
    </section>`;
    }

    function factionSnapshot(profile, ref, tone) {
        const roster = factionStatusMembers(profile);
        const members = roster.length || factionMemberCount(profile, tone);
        const known = [];
        let online = 0;
        let attackable = 0;
        let hospital = 0;
        let hospitalSoon = 0;
        let abroad = 0;
        roster.forEach(member => {
            const id = Number(member?.id || member?.player_id || member?.playerId || member?.user_id || member?.userId || 0);
            const meta = warStatusMetaFor(id, member);
            const activity = extractActivityState(meta) || extractActivityState(member);
            if (activity === "online") online += 1;
            const timed = timedWarStatus(meta);
            const status = [
                favoriteTargetStatusText(meta),
                favoriteTargetStatusText(member),
                meta?.travelLabel
            ].filter(Boolean).join(" ").toLowerCase();
            const isHospital = timed?.kind === "hospital" || /hospital|\bhosp\b/.test(status);
            const isAbroad = timed?.kind === "travel" || /travel|flying|returning|abroad/.test(status);
            const isBlocked = isHospital || isAbroad || /jail|federal|fallen|dead|disabled/.test(status);
            if (isHospital) {
                hospital += 1;
                if (Number(meta?.hospitalUntil || 0) > Date.now() / 1000 && Number(meta.hospitalUntil) - Date.now() / 1000 <= PRECALL_WINDOW_SECONDS) hospitalSoon += 1;
            }
            if (isAbroad) abroad += 1;
            if (!isBlocked && /\bokay\b/.test(status)) attackable += 1;
            const prediction = state.bspPredictions.get(id);
            const value = bspTotalValue(prediction, prediction?.label);
            if (value > 0) known.push({ value, name: String(member?.name || member?.player_name || `Player ${id}`) });
        });
        known.sort((left, right) => right.value - left.value);
        const knownTotal = known.reduce((sum, item) => sum + item.value, 0);
        const average = known.length ? knownTotal / known.length : 0;
        const factionId = Number(ref?.id || profile?.id || 0);
        const loadedAt = Math.max(Number(profile?._loadedAt || 0), Number(state.warStatusFetchedAt.get(factionId) || 0));
        return {
            name: String(profile?.name || ref?.name || (tone === "own" ? "Your faction" : "Enemy faction")),
            members,
            online,
            knownTotal,
            knownTotalLabel: formatStatEstimate(knownTotal) || "--",
            coverage: `${known.length} of ${roster.length || members || 0}`,
            averageLabel: formatStatEstimate(average) || "--",
            strongest: known[0] ? `${known[0].name} - ${formatStatEstimate(known[0].value)}` : "--",
            attackable,
            hospitalLabel: hospitalSoon ? `${hospital} / ${hospitalSoon} soon` : String(hospital),
            abroad,
            freshness: loadedAt ? timeAgo(Math.floor(loadedAt / 1000)) : state.factionSnapshotPending ? "Loading" : "Waiting"
        };
    }

    function factionPerson(value, profile) {
        if (value && typeof value === "object") return String(value.name || value.player_name || value.id || "--");
        const id = Number(value);
        if (id && Array.isArray(profile?.members)) {
            const member = profile.members.find(row => Number(row?.id || row?.player_id) === id);
            if (member) return String(member.name || member.player_name || id);
        }
        if (id && profile?.members && typeof profile.members === "object") {
            const member = profile.members[id] || profile.members[String(id)];
            if (member && typeof member === "object") return String(member.name || member.player_name || id);
        }
        return value ? String(value) : "--";
    }

    function factionMemberCount(profile, tone) {
        if (Array.isArray(profile.members)) return profile.members.length;
        if (profile.members && typeof profile.members === "object") return Object.keys(profile.members).length;
        if (Number(profile.member_count || profile.members_count || profile.members)) return Number(profile.member_count || profile.members_count || profile.members);
        const lists = Array.from(document.querySelectorAll(".faction-war .members-list"));
        const list = tone === "enemy" ? lists[0] : lists[1];
        return list ? list.querySelectorAll(".table-body > .table-row,.enemy,.your").length : "--";
    }

    function loadPersistentCaches() {
        const now = Date.now();
        try {
            const pins = JSON.parse(getValue(STORAGE.pinnedTargets, "[]") || "[]");
            state.pinnedTargets = new Set(
                (Array.isArray(pins) ? pins : [])
                    .map(Number)
                    .filter(id => Number.isFinite(id) && id > 0)
                    .slice(0, 100)
            );
        } catch (err) {
            state.pinnedTargets = new Set();
        }
        try {
            state.favoriteTargets = normalizeFavoriteTargets(JSON.parse(getValue(STORAGE.favoriteTargets, "[]") || "[]"));
        } catch (err) {
            state.favoriteTargets = [];
        }
        try {
            const cached = JSON.parse(getValue(STORAGE.bspCache, "") || "{}");
            const entries = Number(cached.version) === 2 && cached.provider === "ffscouter" ? cached.entries : {};
            Object.entries(entries || {}).forEach(([key, item]) => {
                const id = Number(key);
                const cachedAt = Number(item?.cachedAt || 0);
                if (Number.isFinite(id) && id > 0 && !item?.missing && cachedAt > now - BSP_CACHE_TTL_MS) {
                    state.bspPredictions.set(id, item);
                }
            });
        } catch (err) {
            // Invalid local caches are ignored and replaced after the next successful request.
        }
        try {
            const cached = JSON.parse(getValue(STORAGE.factionProfileCache, "") || "{}");
            Object.entries(cached.entries || {}).forEach(([key, item]) => {
                const id = Number(key);
                const cachedAt = Number(item?.cachedAt || 0);
                if (Number.isFinite(id) && id > 0 && cachedAt > now - FACTION_PROFILE_CACHE_TTL_MS && item?.profile && typeof item.profile === "object") {
                    state.factionProfiles.set(id, item.profile);
                }
            });
        } catch (err) {
            // Faction cards can load normally when no valid local cache exists.
        }
        try {
            const cached = JSON.parse(getValue(STORAGE.warStatusCache, "") || "{}");
            if (Number(cached.version) === 3 && Number(cached.savedAt || 0) > now - WAR_STATUS_CACHE_TTL_MS) {
                Object.entries(cached.entries || {}).forEach(([key, meta]) => {
                    const id = Number(key);
                    if (Number.isFinite(id) && id > 0 && meta && typeof meta === "object") state.warStatusById.set(id, meta);
                });
                Object.entries(cached.factions || {}).forEach(([key, fetchedAt]) => {
                    const factionId = Number(key);
                    if (Number.isFinite(factionId) && Number(fetchedAt) > 0) state.warStatusFetchedAt.set(factionId, Number(fetchedAt));
                });
            }
        } catch (err) {
            // The dashboard status feed will repopulate an invalid or expired cache.
        }
    }

    function compactBspCacheEntry(item) {
        const label = cleanWarTableText(item?.label || item?.actual_total_stats_human || item?.total_stats_human || item?.bs_estimate_human || formatStatEstimate(item?.actual_total_stats || item?.total_stats || item?.bs_estimate));
        const total = bspTotalValue(item, label);
        const score = Number(item?.score || item?.Score || 0);
        const compact = {
            label,
            cachedAt: Number(item?.cachedAt || Date.now()),
            provider: "ffscouter"
        };
        if (total > 0) compact.actual_total_stats = total;
        if (score > 0) compact.score = score;
        return compact;
    }

    function persistOptionalCache(key, value, fallbackValue = "") {
        try {
            setValue(key, value);
            return true;
        } catch (err) {
            try {
                setValue(key, fallbackValue);
            } catch (clearError) {
                // Optional caches must never prevent live data from rendering.
            }
            return false;
        }
    }

    function saveBspCache() {
        const entries = {};
        Array.from(state.bspPredictions.entries())
            .filter(([, item]) => !item?.missing && Number(item?.cachedAt || 0) > Date.now() - BSP_CACHE_TTL_MS)
            .sort((left, right) => Number(right[1]?.cachedAt || 0) - Number(left[1]?.cachedAt || 0))
            .slice(0, PERSISTENT_CACHE_MAX_PLAYERS)
            .forEach(([id, item]) => { entries[id] = compactBspCacheEntry(item); });
        return persistOptionalCache(
            STORAGE.bspCache,
            JSON.stringify({ version: 2, provider: "ffscouter", savedAt: Date.now(), entries }),
            JSON.stringify({ version: 2, provider: "ffscouter", savedAt: Date.now(), entries: {} })
        );
    }

    function saveFactionProfileCache() {
        const existing = (() => {
            try { return JSON.parse(getValue(STORAGE.factionProfileCache, "") || "{}").entries || {}; }
            catch (err) { return {}; }
        })();
        state.factionProfiles.forEach((profile, id) => {
            existing[id] = { profile, cachedAt: Date.now() };
        });
        const entries = Object.fromEntries(Object.entries(existing)
            .filter(([, item]) => Number(item?.cachedAt || 0) > Date.now() - FACTION_PROFILE_CACHE_TTL_MS)
            .sort((left, right) => Number(right[1]?.cachedAt || 0) - Number(left[1]?.cachedAt || 0))
            .slice(0, 20));
        persistOptionalCache(STORAGE.factionProfileCache, JSON.stringify({ version: 1, savedAt: Date.now(), entries }));
    }

    function saveWarStatusCache() {
        const entries = Object.fromEntries(Array.from(state.warStatusById.entries()).slice(-250));
        const factions = Object.fromEntries(state.warStatusFetchedAt.entries());
        persistOptionalCache(STORAGE.warStatusCache, JSON.stringify({ version: 3, savedAt: Date.now(), entries, factions }));
    }

    async function loadFactionProfiles(force = false) {
        if (!getApiKey()) return;
        let detected = detectWarFactionRefs();
        let refs = Object.values(detected).filter(ref => Number(ref?.id));
        if (refs.length < 2) {
            await loadActiveWarOpponent();
            detected = detectWarFactionRefs();
            refs = Object.values(detected).filter(ref => Number(ref?.id));
        } else {
            loadActiveWarOpponent().catch(() => { });
        }
        let changed = false;
        await Promise.all(refs.map(async ref => {
            const id = Number(ref.id);
            const cached = state.factionProfiles.get(id);
            if ((!force && cached && Number(cached?._loadedAt || 0) > Date.now() - FACTION_PROFILE_LIVE_TTL_MS) || state.factionLoads.has(id)) return;
            state.factionLoads.add(id);
            try {
                const basicRequest = apiRequest(`/api/torn/faction/${id}/basic`, null, "GET")
                    .then(value => ({ ok: true, value }), error => ({ ok: false, error }));
                const statusRequest = apiRequest(`/api/war-enhancer/faction/${id}?bsp=0&telemetry=0&war_id=${encodeURIComponent(state.warId || detectWarId() || "")}`, null, "GET")
                    .then(value => ({ ok: true, value }), error => ({ ok: false, error }));
                const statusResult = await statusRequest;
                const statusRoster = statusResult.ok ? factionStatusMembers(statusResult.value) : [];
                if (statusRoster.length) {
                    state.factionProfiles.set(id, {
                        ...(cached && typeof cached === "object" ? cached : {}),
                        name: cached?.name || ref.name || `Faction ${id}`,
                        member_count: Math.max(Number(cached?.member_count || 0), statusRoster.length),
                        members: statusRoster,
                        _loadedAt: Date.now()
                    });
                    changed = true;
                    if (getValue(STORAGE.activeTab, "faction") === "faction") renderPanel();
                }
                const basicResult = await basicRequest;
                if (!basicResult.ok && !statusRoster.length) throw basicResult.error;
                const payload = basicResult.ok ? basicResult.value : {};
                const basic = payload?.basic || payload?.faction || payload?.data || payload || {};
                let roster = factionStatusMembers(payload?.members?.members ?? payload?.members ?? payload?.faction?.members ?? []);
                const declaredCount = Math.max(0, ...[
                    basic?.member_count,
                    basic?.members_count,
                    typeof basic?.members === "number" ? basic.members : 0
                ].map(value => Number(value)).filter(Number.isFinite));
                if (statusRoster.length > roster.length) roster = statusRoster;
                const profile = {
                    ...(cached && typeof cached === "object" ? cached : {}),
                    ...(basic && typeof basic === "object" ? basic : {}),
                    member_count: Math.max(declaredCount, roster.length),
                    members: roster,
                    _loadedAt: Date.now()
                };
                state.factionProfiles.set(id, profile && typeof profile === "object" ? profile : {});
                changed = true;
            } catch (err) {
                if (!cached) {
                    state.factionProfiles.set(id, { name: ref.name || `Faction ${id}` });
                    changed = true;
                }
            } finally {
                state.factionLoads.delete(id);
            }
        }));
        if (changed) saveFactionProfileCache();
        const snapshotIds = Array.from(new Set(refs.flatMap(ref => factionStatusMembers(state.factionProfiles.get(Number(ref.id)) || {})
            .map(member => Number(member?.id || member?.player_id || member?.playerId || member?.user_id || member?.userId || 0))
            .filter(id => Number.isFinite(id) && id > 0)))).sort((left, right) => left - right);
        const snapshotKey = snapshotIds.join(",");
        // The faction comparison is a summary, not a live target board. Refresh
        // its BSP snapshot only when the roster changes or an admin presses
        // Refresh. War-list hospital and travel polling remains independent.
        const snapshotDue = snapshotKey && (
            force
            || snapshotKey !== state.factionSnapshotRosterKey
            || !state.factionSnapshotLoadedAt
        );
        if (snapshotDue && !state.factionSnapshotPending) {
            state.factionSnapshotPending = true;
            try {
                await Promise.allSettled([
                    refreshWarStatusFeed(false),
                    refreshEmuBspStats(snapshotIds.map(id => ({ id, row: null })), false)
                ]);
                state.factionSnapshotRosterKey = snapshotKey;
                state.factionSnapshotLoadedAt = Date.now();
            } finally {
                state.factionSnapshotPending = false;
            }
            changed = true;
        }
        if (changed && getValue(STORAGE.activeTab, "faction") === "faction") renderPanel();
    }

    async function loadActiveWarOpponent(force = false) {
        const ownId = Number(state.faction?.id || state.faction?.faction_id || 0);
        if (!ownId || state.warOpponentPending) return;
        if (!force && state.warOpponentLoadedAt > Date.now() - 60 * 1000) return;
        state.warOpponentPending = true;
        try {
            const payload = await apiRequest(`/api/torn/faction/${ownId}/rankedwars`, null, "GET");
            const rawWars = payload?.rankedwars;
            const wars = Array.isArray(rawWars)
                ? rawWars
                : rawWars && typeof rawWars === "object"
                    ? Object.entries(rawWars).map(([warId, war]) => ({ ...(war || {}), id: war?.id || war?.war_id || warId }))
                    : [];
            const active = wars
                .filter(war => war && (war.winner === null || war.winner === undefined || Number(war.winner) === 0))
                .map(war => {
                    const rawFactions = war?.factions;
                    const factions = Array.isArray(rawFactions)
                        ? rawFactions
                        : rawFactions && typeof rawFactions === "object"
                            ? Object.entries(rawFactions).map(([factionId, faction]) => ({ ...(faction || {}), id: faction?.id || factionId }))
                            : [];
                    return { ...war, factions };
                })
                .filter(war => war.factions.some(faction => Number(faction?.id) === ownId))
                .sort((left, right) => Number(right.start || 0) - Number(left.start || 0))[0];
            const enemy = active?.factions?.find(faction => Number(faction?.id) !== ownId);
            const own = active?.factions?.find(faction => Number(faction?.id) === ownId);
            state.activeRankedWarId = String(active?.id || active?.war_id || active?.ranked_war_id || "").trim();
            state.activeRankedWar = active
                ? {
                    id: state.activeRankedWarId,
                    start: Number(active.start || active.started || 0),
                    target: Number(active.target || active.war_target || 0),
                    own: own ? { id: Number(own.id || 0), name: cleanName(own.name || state.faction?.name || "Your faction"), score: Number(own.score || own.points || 0) } : null,
                    enemy: enemy ? { id: Number(enemy.id || 0), name: cleanName(enemy.name || `Faction ${enemy.id}`), score: Number(enemy.score || enemy.points || 0) } : null
                }
                : null;
            state.warOpponent = Number(enemy?.id)
                ? { id: Number(enemy.id), name: cleanName(enemy.name || `Faction ${enemy.id}`) }
                : null;
            state.warOpponentResolved = true;
        } catch (err) {
            // The visible war table remains the fallback when ranked-war lookup is unavailable.
        } finally {
            state.warOpponentLoadedAt = Date.now();
            state.warOpponentPending = false;
        }
    }

    function quickApiHtml() {
        return `
      <div class="emu-caller-quick-key emu-caller-setup">
        <strong>Set up EmuControl Companion</strong>
        <p>EmuControl Companion handles shared calls and your existing Torn enhancements.</p>
        ${apiKeyChoicesHtml()}
        <label class="emu-caller-label">Torn API Key <small>Custom or Full Access</small>
          <input id="emu-caller-quick-api-key" type="password" autocomplete="off" />
        </label>
        ${statsProviderHtml("quick")}
        <div class="emu-caller-actions">
          <button type="button" data-quick-save-settings>Save &amp; connect</button>
        </div>
      </div>
    `;
    }

    function apiKeyChoicesHtml() {
        return `
      <div class="emu-caller-key-choices">
        <p>Both work with Caller. Custom is recommended because it only requests EmuControl's required selections.</p>
        <div>
          <a class="recommended" href="${TORN_CUSTOM_KEY_URL}" target="_blank" rel="noopener noreferrer">Custom (Recommended)</a>
          <a href="${TORN_FULL_ACCESS_KEY_URL}" target="_blank" rel="noopener noreferrer">Full Access</a>
        </div>
      </div>
    `;
    }

    function statsProviderHtml() {
        return "";
    }

    function factionAnnouncementComposerHtml(hasKey = true) {
        const canSend = Boolean(hasKey && state.announcementPermissionKnown && state.canAnnounce);
        const now = Math.floor(Date.now() / 1000);
        const recent = (Array.isArray(state.announcements) ? state.announcements : [])
            .filter(announcement => announcement && announcement.id && now - Number(announcement.created_at || 0) <= ANNOUNCEMENT_VISIBLE_SECONDS)
            .sort((left, right) => Number(right.created_at || 0) - Number(left.created_at || 0));
        const feed = recent.length
            ? `<div class="emu-caller-announcement-feed">${recent.map(announcement => `<article><strong>${escapeHtml(announcement.senderName || "Faction admin")}</strong><span>${escapeHtml(announcement.message || "")}</span><small>${timeAgo(announcement.created_at)}</small></article>`).join("")}</div>`
            : `<div class="emu-caller-empty">No faction announcements in the last 5 minutes.</div>`;
        const reader = `<div class="emu-caller-announcement-reader"><strong>Faction announcements</strong><span>Announcements remain here for 5 minutes.</span></div>${feed}`;
        if (!canSend) {
            const readOnlyStatus = !hasKey
                ? "Save your Torn key in Settings to load faction announcements."
                : !state.announcementPermissionKnown
                    ? "Checking send access..."
                    : "Read only - faction admins can send announcements.";
            return `${reader}<div class="emu-caller-announcement-readonly">${readOnlyStatus}</div>`;
        }
        const status = "Ready - this announcement will only go to your faction.";
        const disabled = state.announcementPending || !canSend;
        return `${reader}<div class="emu-caller-announcement-composer" data-announcement-ready="true"><div class="emu-caller-page-title">Send announcement</div><p>Send a popup to members of your faction only.</p><textarea data-announcement-message maxlength="${ANNOUNCEMENT_MAX_LENGTH}" placeholder="Type a faction announcement...">${escapeHtml(state.announcementDraft)}</textarea><div class="emu-caller-actions"><button type="button" data-send-announcement ${disabled ? "disabled" : ""}>${state.announcementPending ? "Sending..." : "Send announcement"}</button></div><small>${status}</small></div>`;
    }

    function planHtml() {
        const calls = Array.from(state.calls.values());
        const callRows = calls.length ? `<div class="emu-caller-call-list">${calls.map(call => `
      <div class="emu-caller-call-row">
        <div><strong>${escapeHtml(call.targetName || `Player ${call.targetId}`)}</strong><span>${escapeHtml(call.callerName || "Unknown")} dibbed ${timeAgo(call.updated_at)}</span></div>
        ${isOwnCall(call) ? `<button type="button" data-uncall="${call.targetId}">Uncall</button>` : `<small>Claimed</small>`}
      </div>
    `).join("")}</div>` : `<div class="emu-caller-empty">No targets dibbed yet.</div>`;
        return `<div class="emu-caller-page-title">Current war</div><div class="emu-caller-plan-grid"><div><span>Connection</span><strong>${state.connected ? "Connected" : "Waiting"}</strong></div><div><span>War ID</span><strong>${escapeHtml(state.warId || detectWarId())}</strong></div><div><span>Active calls</span><strong>${calls.length}</strong></div><div><span>Script users</span><strong>${onlineMembers().length}</strong></div></div><div class="emu-caller-control-row"><div><strong>Calls enabled</strong><span>Members can reserve one enemy at a time.</span></div><label class="emu-caller-switch"><input type="checkbox" data-plan-enabled ${getBool(STORAGE.enabled, true) ? "checked" : ""} /><i></i></label></div><div class="emu-caller-control-row"><div><strong>Attack complete auto-release</strong><span>Completed attacks release the caller-owned target and assistance request.</span></div><b class="emu-caller-enabled-label">Enabled</b></div><div class="emu-caller-page-title">Active calls</div>${callRows}`;
    }

    function chainHtml() {
        const display = chainTimerDisplayState();
        const threshold = chainAlertThreshold();
        const favoriteCount = readFavoriteTargets().length;
        return `<div class="emu-caller-page-title">Chain timer</div><div class="emu-caller-chain-card"><strong data-emu-caller-live-chain-title>${display.title}</strong><span data-emu-caller-live-chain-time>${display.detail}</span><div><i data-emu-caller-live-chain-progress style="width:${display.progress.toFixed(1)}%"></i></div></div><div class="emu-caller-chain-settings"><section><div class="emu-caller-page-title">Flash alert</div><label class="emu-caller-check"><input type="checkbox" data-chain-flash ${getBool(STORAGE.chainFlash, false) ? "checked" : ""} /> Enable</label><label class="emu-caller-label">Warn below<div class="emu-caller-chain-slider"><input type="range" min="60" max="210" step="30" data-chain-below value="${threshold}" /><output data-chain-below-output>${formatChainClock(threshold)}</output></div></label><p>Flashes continuously while the timer is below your selected time.</p></section><section><div class="emu-caller-page-title">Beep alert</div><label class="emu-caller-check"><input type="checkbox" data-chain-beep ${getBool(STORAGE.chainBeep, false) ? "checked" : ""} /> Enable</label><p>Plays a short alert at the same threshold. Alerts arm automatically once the chain reaches ${CHAIN_ALERT_MIN_HITS} hits.</p></section></div><div class="emu-caller-actions"><button type="button" data-test-chain-alert>Test alert</button><button type="button" data-chain-target>Random chain target</button><button type="button" data-favourite-target>Pinned target${favoriteCount ? ` (${favoriteCount})` : ""}</button></div>`;
    }

    function visibleChainPanelBody() {
        const root = document.getElementById("emu-war-caller-root");
        const panel = document.getElementById("emu-war-caller-panel");
        const body = document.getElementById("emu-caller-tab-body");
        if (!root || root.hidden || root.classList.contains("collapsed") || !panel?.classList.contains("open")) return null;
        return body?.dataset.emuCallerTab === "chain" ? body : null;
    }

    function refreshMountedChainOrder() {
        const body = visibleChainPanelBody();
        if (!body) return;
        let card = body.querySelector(".emu-caller-shared-order");
        const order = state.sharedChainOrder;
        if (!hasMeaningfulSharedChainOrder(order)) {
            card?.remove();
            return;
        }
        if (!card) {
            card = document.createElement("div");
            card.className = "emu-caller-shared-order";
            body.prepend(card);
        }
        const bonus = Number(order.chain_bonus_hit || 0)
            ? `Bonus ${Number(order.chain_bonus_hit).toLocaleString()} reserved for ${order.chain_bonus_reserved_by || "unassigned"}`
            : "No bonus hit reserved";
        card.innerHTML = `<span>Leadership order</span><strong>${escapeHtml(String(order.chain_command || "open").toUpperCase())}</strong><small>Captain: ${escapeHtml(order.chain_captain || "not assigned")} &middot; ${escapeHtml(bonus)}</small>${order.chain_message ? `<p>${escapeHtml(order.chain_message)}</p>` : ""}`;
    }

    function hasMeaningfulSharedChainOrder(order) {
        if (!order || typeof order !== "object" || !Number(order.updated_at || 0)) return false;
        return String(order.chain_command || "open").toLowerCase() !== "open"
            || Boolean(String(order.chain_captain || "").trim())
            || Boolean(Number(order.chain_bonus_hit || 0))
            || Boolean(String(order.chain_bonus_reserved_by || "").trim())
            || Boolean(String(order.chain_message || "").trim());
    }

    function chainTimerDisplayState() {
        const now = Math.floor(Date.now() / 1000);
        const exact = findTornChainSnapshot();
        if (exact?.seconds) saveChainAlertSnapshot({ hits: exact.hits, timeout: now + exact.seconds, fetchedAt: now });
        const parsed = parseChainProgress(findChainText());
        const snapshot = state.chainSnapshot;
        const current = Math.max(0, Number(exact?.hits || parsed?.current || snapshot?.hits || findSidebarChainHits()) || 0);
        const next = current ? nextChainBonus(current) : 10;
        const remaining = current ? Math.max(0, next - current) : 0;
        let seconds = exact?.seconds || Math.max(0, Number(snapshot?.timeout || 0) - now);
        if (!seconds) seconds = Math.max(0, Number(findChainTimer()?.seconds || 0));
        const progress = current ? Math.max(0, Math.min(100, (current / next) * 100)) : 0;
        return {
            title: current ? `Chain ${current}/${next}` : "No active chain",
            detail: seconds
                ? `${formatChainClock(seconds)} remaining | ${remaining} hits to bonus`
                : current
                    ? `${remaining} hits to bonus`
                    : "Waiting for Torn chain data",
            progress
        };
    }

    function refreshMountedChainTimer() {
        if (document.hidden) return;
        const body = visibleChainPanelBody();
        if (!body) return;
        const display = chainTimerDisplayState();
        const title = body.querySelector("[data-emu-caller-live-chain-title]");
        const time = body.querySelector("[data-emu-caller-live-chain-time]");
        const progress = body.querySelector("[data-emu-caller-live-chain-progress]");
        if (title && title.textContent !== display.title) title.textContent = display.title;
        if (time && time.textContent !== display.detail) time.textContent = display.detail;
        if (progress) progress.style.width = `${display.progress.toFixed(1)}%`;
    }

    function statsHtml() {
        const now = Math.floor(Date.now() / 1000);
        const calls = Array.from(state.calls.values())
            .filter(call => !callExpiresAt(call) || callExpiresAt(call) > now)
            .sort((left, right) => Number(right.created_at || right.updated_at || 0) - Number(left.created_at || left.updated_at || 0));
        const callRows = calls.length ? `<div class="emu-caller-call-list">${calls.map(call => {
            const expiresAt = callExpiresAt(call);
            const remaining = expiresAt ? `${formatRemainingSeconds(Math.max(0, expiresAt - now))} left` : "until released";
            return `<div class="emu-caller-call-row"><div><strong>${escapeHtml(call.callerName || "Unknown")} &rarr; ${escapeHtml(call.targetName || `Player ${call.targetId}`)}</strong><span>Called ${timeAgo(call.created_at || call.updated_at)} &middot; ${escapeHtml(remaining)}</span></div>${isOwnCall(call) ? `<button type="button" data-uncall="${call.targetId}">Uncall</button>` : `<small>Claimed</small>`}</div>`;
        }).join("")}</div>` : `<div class="emu-caller-empty">No active calls right now.</div>`;
        const own = detectWarFactionRefs().own;
        const members = factionMemberCount(state.factionProfiles.get(Number(own.id)) || {}, "own");
        return `<div class="emu-caller-page-title">Live call log</div><p class="emu-caller-help">Calls stay here for the attack window and disappear after the attack is completed, the caller uncalls, or the timer expires.</p>${callRows}<div class="emu-caller-stat-summary"><strong>${onlineMembers().length} active Companion check-ins / ${escapeHtml(members)} faction members</strong><span>Active means the script checked in during the last 5 minutes. It is not Torn online status.</span></div>`;
    }

    function attacksHtml() {
        const rallies = Array.isArray(state.rallies) ? state.rallies : [];
        const events = (Array.isArray(state.events) ? state.events : []).filter(isAssistanceActivityEvent);
        const requestRows = rallies.map(rally => {
            const filled = rallyAssistCount(rally);
            const slots = Math.max(1, Math.min(5, Number(rally.slots) || 1));
            const full = filled >= slots;
            return `
      <div class="emu-caller-attack-request scope-${String(rally.scope || "alliance").toLowerCase() === "faction" ? "faction" : "alliance"}${full ? " full" : ""}">
        <div><strong>${escapeHtml(rallyRequestHeading(rally, filled, slots))}</strong><span>${rallyTargetSummary(rally)}</span></div>
        ${rally.attackUrl ? `<button type="button" data-attack-rally="${escapeAttr(rally.id)}" ${full && !isOwnRally(rally) ? "disabled" : ""}>${full && !isOwnRally(rally) ? "Full" : "Attack now"}</button>` : ""}
      </div>
    `;
        }).join("");
        const eventRows = events.slice(0, 50).map(event => `
      <div class="emu-caller-event-row">
        <strong>${escapeHtml(event.message || event.type || "Attack")}</strong>
        <span>${rallyTargetSummary(event)} ${event.result ? `- ${escapeHtml(event.result)}` : ""}</span>
        <small>${escapeHtml(event.callerName || "Unknown")} - ${timeAgo(event.created_at || event.updated_at)}</small>
      </div>
    `).join("");
        if (!requestRows && !eventRows) return `<div class="emu-caller-empty">No active assistance requests or attack logs.</div>`;
        return `
      ${requestRows ? `<div class="emu-caller-section-title">Assistance requests</div><div class="emu-caller-attack-list">${requestRows}</div>` : ""}
      ${eventRows ? `<div class="emu-caller-section-title">Recent attack activity</div><div class="emu-caller-event-list">${eventRows}</div>` : ""}
    `;
    }

    function isAssistanceActivityEvent(event) {
        const type = String(event?.type || "").toLowerCase();
        return event?.assistance === true
            || Boolean(String(event?.rallyId || "").trim())
            || ["rally", "rally_join", "rally_cancel"].includes(type);
    }

    function rallyTargetSummary(item) {
        const targetId = Number(item?.targetId || 0);
        const name = normalizeAttackTargetName(item?.targetName, targetId)
            || normalizeAttackTargetName(state.calls.get(targetId)?.targetName, targetId)
            || normalizeAttackTargetName(state.targetMeta.get(targetId)?.name, targetId)
            || (targetId ? `Player ${targetId}` : "Target");
        const bsp = cleanWarTableText(item?.targetBsp || bspValueForId(targetId, null) || "");
        return `on &ldquo;${escapeHtml(name)}&rdquo;${bsp ? ` | BSP ${escapeHtml(bsp)}` : " | BSP unavailable"}`;
    }

    function helpHtml() {
        return `
      <div class="emu-caller-help">
        <div class="emu-caller-page-title">Features</div>
        <p><strong>Calls</strong><br />Use Call to reserve one enemy. Hospital pre-calls open during the final three minutes and expire two minutes after release; completed attacks release your call immediately.</p>
        <p><strong>Assistance</strong><br />The compact attack-page bar requests a faction or alliance hit. Attack Activity only records targets with an active help request and carries the request's saved name and BSP; requests and logs expire after 10 minutes.</p>
        <p><strong>Sorting and pins</strong><br />Pins and called targets stay at the top. BSP, Score and the separate clock control each sort independently without hospital timing overriding the selected column.</p>
        <p><strong>BSP and timers</strong><br />EmuControl BSP estimates appear across wars, factions, companies, personal lists, hospital, jail and profiles while the shared cache keeps pages fast.</p>
        <p><strong>Quick Revive</strong><br />When you are in hospital, use the Pennywise Medical button in Torn's hospital header. It sends only your authenticated Torn player ID to Pennywise; your Torn API key is never shared.</p>
        <p><strong>Chain alerts</strong><br />Choose 1:00 to 3:30 in 30-second steps. At 25 or more hits, Flash pulses continuously below the selected time and Beep adds a sound.</p>
        <p><strong>Chain target</strong><br />Opens an inactive factionless target and avoids recent picks.</p>
        <p><strong>Favourite target</strong><br />Live-checks targets pinned in Target Finder and opens one Torn currently reports as Okay. The list syncs automatically through your account.</p>
        <p><strong>Privacy</strong><br />The page bridge reads Torn war responses but never changes Torn requests or responses. Stored member keys only supply permitted same-faction telemetry.</p>
        <div class="emu-caller-page-title">Debug</div>
        <div class="emu-caller-plan-grid"><div><span>Version</span><strong>${RUNTIME_VERSION}</strong></div><div><span>User</span><strong>${escapeHtml(state.owner?.name || "Unknown")}</strong></div><div><span>Faction</span><strong>${escapeHtml(state.faction?.name || "Unknown")}</strong></div><div><span>War</span><strong>${escapeHtml(state.warId || detectWarId())}</strong></div></div>
        <div class="emu-caller-provider-links"><a class="emu-caller-update-link" href="${DASHBOARD_ORIGIN}/emu-war-caller-pda.user.js">Update Companion</a><a href="${DASHBOARD_ORIGIN}/emu-war-caller.html" target="_blank" rel="noopener noreferrer">Website</a><a href="${DASHBOARD_ORIGIN}/emucontrol-companion-guide.html" target="_blank" rel="noopener noreferrer">Guide</a><a href="${DASHBOARD_ORIGIN}/privacy-emuwar-caller.html" target="_blank" rel="noopener noreferrer">Privacy</a></div>
        <div class="emu-caller-page-title">What's new - v${RUNTIME_VERSION}</div><p>Opponent war rows now recognize Torn's overseas-hospital country wording, keeping foreign hospital countdowns orange and Torn hospital countdowns red.</p>
      </div>
    `;
    }

    function settingsHtml() {
        const updateAvailable = Boolean(state.updateAvailableVersion)
            && isNewerCompanionVersion(state.updateAvailableVersion, RUNTIME_VERSION);
        const updateChecking = !state.updateCheckCompleted && !state.latestCompanionVersion;
        const updateCheckFailed = state.updateCheckFailed && !updateAvailable;
        const openMarketEnabled = getBool(STORAGE.openMarketEnabled, true);
        return `
      <section class="emu-caller-settings-group">
        <div class="emu-caller-page-title">Account &amp; API</div>
        ${apiKeyChoicesHtml()}
        <label class="emu-caller-label">Torn API Key
          <input id="emu-caller-api-key" type="password" value="${escapeAttr(getApiKey())}" autocomplete="off" />
        </label>
        ${statsProviderHtml("settings")}
      </section>
      <section class="emu-caller-settings-group">
        <div class="emu-caller-page-title">War &amp; calls</div>
        <label class="emu-caller-check"><input id="emu-caller-enabled" type="checkbox" ${getBool(STORAGE.enabled, true) ? "checked" : ""} /> Enabled</label>
        <label class="emu-caller-check"><input id="emu-caller-sort" type="checkbox" ${getBool(STORAGE.autoSort, true) ? "checked" : ""} /> Keep called and pinned enemies at the top</label>
        <label class="emu-caller-check"><input id="emu-caller-list" type="checkbox" ${getBool(STORAGE.autoList, true) ? "checked" : ""} /> Auto-list war rows</label>
        <div class="emu-caller-setting-toggle">
          <div><strong>Alliance attack blocker</strong><small>Turn off the large attack-screen blocker. The red alliance warning and green X stay visible.</small></div>
          <label class="emu-caller-switch"><input id="emu-caller-alliance-blocker" type="checkbox" ${getBool(STORAGE.allianceBlocker, true) ? "checked" : ""} /><i></i></label>
        </div>
        <label class="emu-caller-label">Travel speed mode
          <select id="emu-caller-speed">
            ${["PI", "BCT", "WLT", "Standard"].map(mode => `<option value="${mode}" ${getValue(STORAGE.speedMode, "PI") === mode ? "selected" : ""}>${mode}</option>`).join("")}
          </select>
        </label>
      </section>
      <section class="emu-caller-settings-group">
        <div class="emu-caller-page-title">Page tools</div>
        <div class="emu-caller-setting-toggle emu-caller-market-master">
          <div><strong>OpenMarket quality &amp; bonuses</strong><small>Shows item quality and bonuses on selected market pages.</small></div>
          <label class="emu-caller-switch"><input id="emu-caller-openmarket-enabled" data-openmarket-setting="master" type="checkbox" ${openMarketEnabled ? "checked" : ""} /><i></i></label>
        </div>
        <div class="emu-caller-market-pages ${openMarketEnabled ? "" : "disabled"}">
          <label class="emu-caller-check"><input id="emu-caller-openmarket-itemmarket" data-openmarket-setting="itemMarket" type="checkbox" ${getBool(STORAGE.openMarketItemMarket, true) ? "checked" : ""} /> Item Market</label>
          <label class="emu-caller-check"><input id="emu-caller-openmarket-auction" data-openmarket-setting="auctionHouse" type="checkbox" ${getBool(STORAGE.openMarketAuctionHouse, true) ? "checked" : ""} /> Auction House</label>
          <label class="emu-caller-check"><input id="emu-caller-openmarket-bazaar" data-openmarket-setting="bazaar" type="checkbox" ${getBool(STORAGE.openMarketBazaar, true) ? "checked" : ""} /> Bazaars</label>
        </div>
      </section>
      <section class="emu-caller-settings-group">
        <div class="emu-caller-page-title">Maintenance &amp; updates</div>
        <div class="emu-caller-actions">
          <button type="button" data-save-settings>Test &amp; save all keys</button>
          <button type="button" data-clear-cache>Clear local state</button>
        </div>
        <div class="emu-caller-update-card ${updateAvailable ? "pending" : "current"}">
          <div><span>Installed version</span><strong>v${escapeHtml(RUNTIME_VERSION)}</strong></div>
          <div><span>Status</span><strong>${updateChecking ? "Checking..." : updateCheckFailed ? "Check unavailable" : updateAvailable ? `v${escapeHtml(state.updateAvailableVersion)} available` : "Up to date"}</strong></div>
          ${updateAvailable ? `<button type="button" data-update-companion>Update Script</button>` : ""}
          <small>${updateAvailable ? escapeHtml(companionUpdateGuidance()) : updateChecking ? "Checking the hosted Companion version." : updateCheckFailed ? "Could not check the hosted version; normal Companion features are unaffected." : "No newer Companion version is available."}</small>
        </div>
      </section>
    `;
    }

    function bindPanelEvents(root) {
        if (root.querySelector("#emu-caller-api-key,#emu-caller-quick-api-key")) {
            const markEditing = () => { state.settingsEditing = true; };
            root.addEventListener("focusin", markEditing, true);
            root.addEventListener("input", markEditing, true);
            root.addEventListener("change", markEditing, true);
        }
        root.querySelector("[data-plan-enabled]")?.addEventListener("change", event => {
            setBool(STORAGE.enabled, Boolean(event.currentTarget.checked));
            syncState();
            scanSoon(0);
            renderPanel();
        });
        root.querySelector("[data-chain-flash]")?.addEventListener("change", event => {
            setBool(STORAGE.chainFlash, Boolean(event.currentTarget.checked));
            if (!event.currentTarget.checked) setChainFlashActive(false);
            checkChainAlerts();
        });
        root.querySelector("[data-chain-beep]")?.addEventListener("change", event => setBool(STORAGE.chainBeep, Boolean(event.currentTarget.checked)));
        root.querySelector("#emu-caller-alliance-blocker")?.addEventListener("change", event => {
            setBool(STORAGE.allianceBlocker, Boolean(event.currentTarget.checked));
            renderAllianceAttackWarning();
        });
        root.querySelectorAll("[data-openmarket-setting]").forEach(input => {
            input.addEventListener("change", event => {
                const setting = String(event.currentTarget.dataset.openmarketSetting || "");
                const storageKey = setting === "master"
                    ? STORAGE.openMarketEnabled
                    : setting === "itemMarket"
                        ? STORAGE.openMarketItemMarket
                        : setting === "auctionHouse"
                            ? STORAGE.openMarketAuctionHouse
                            : STORAGE.openMarketBazaar;
                setBool(storageKey, Boolean(event.currentTarget.checked));
                if (setting === "master") root.querySelector(".emu-caller-market-pages")?.classList.toggle("disabled", !event.currentTarget.checked);
                if (openMarketEnabledForPage()) {
                    bootstrapOpenMarketModule();
                } else if (state.openMarketLoaded && openMarketPageType()) {
                    showToast("OpenMarket is disabled. Refresh this market page to remove the already-loaded module.");
                }
            });
        });
        root.querySelector("[data-chain-below]")?.addEventListener("input", event => {
            const seconds = parseChainAlertThreshold(event.currentTarget.value);
            const output = root.querySelector("[data-chain-below-output]");
            if (output) output.textContent = formatChainClock(seconds);
        });
        root.querySelector("[data-chain-below]")?.addEventListener("change", event => {
            const seconds = parseChainAlertThreshold(event.currentTarget.value);
            setValue(STORAGE.chainAlertBelow, String(seconds));
            event.currentTarget.value = String(seconds);
            const output = root.querySelector("[data-chain-below-output]");
            if (output) output.textContent = formatChainClock(seconds);
            state.lastChainAlertKey = "";
            checkChainAlerts();
        });
        root.querySelector("[data-test-chain-alert]")?.addEventListener("click", () => fireChainAlert(true));
        const announcementEditor = root.querySelector("[data-announcement-message]");
        if (announcementEditor) {
            ["keydown", "keypress", "keyup", "beforeinput"].forEach(type => {
                announcementEditor.addEventListener(type, event => event.stopPropagation());
            });
            announcementEditor.addEventListener("input", event => {
                event.stopPropagation();
                state.announcementDraft = String(event.currentTarget.value || "").slice(0, ANNOUNCEMENT_MAX_LENGTH);
            });
        }
        root.querySelector("[data-send-announcement]")?.addEventListener("click", event => {
            const message = String(root.querySelector("[data-announcement-message]")?.value || state.announcementDraft || "");
            sendFactionAnnouncement(message, event.currentTarget);
        });
        const warBriefEditor = root.querySelector("[data-war-brief-message]");
        if (warBriefEditor) {
            ["keydown", "keypress", "keyup", "beforeinput"].forEach(type => {
                warBriefEditor.addEventListener(type, event => event.stopPropagation());
            });
            warBriefEditor.addEventListener("input", event => {
                event.stopPropagation();
                state.warBriefEditing = true;
                state.warBriefDraft = String(event.currentTarget.value || "").slice(0, WAR_BRIEF_MAX_LENGTH);
            });
        }
        root.querySelector("[data-save-war-brief]")?.addEventListener("click", event => {
            const message = String(root.querySelector("[data-war-brief-message]")?.value || state.warBriefDraft || "");
            updateWarBrief(message, false, event.currentTarget);
        });
        root.querySelector("[data-clear-war-brief]")?.addEventListener("click", event => {
            updateWarBrief("", true, event.currentTarget);
        });
        root.querySelectorAll("[data-attack-rally]").forEach(button => {
            button.addEventListener("click", () => {
                const rally = state.rallies.find(item => String(item?.id || "") === String(button.dataset.attackRally || ""));
                if (rally) joinRallyRequest(rally);
            });
        });
        root.querySelector("[data-quick-save-settings]")?.addEventListener("click", async event => {
            const key = String(root.querySelector("#emu-caller-quick-api-key")?.value || "").trim();
            const button = event.currentTarget;
            button.disabled = true;
            try {
                const auth = await validateApiKeyBeforeSave(key);
                await saveProviderSettings(root, "quick");
                storeValidatedApiKey(key, auth);
                setBool(STORAGE.enabled, true);
                state.lastError = "";
                state.bspError = "";
                state.settingsEditing = false;
                syncState();
                sendHeartbeat();
                renderPanel();
                scanSoon(0);
            } catch (err) {
                state.lastError = `API key not saved: ${friendlyError(err)}`;
                showToast(state.lastError);
                renderPanel();
            } finally {
                button.disabled = false;
            }
        });
        root.querySelector("[data-save-settings]")?.addEventListener("click", async event => {
            const key = String(root.querySelector("#emu-caller-api-key")?.value || "").trim();
            const button = event.currentTarget;
            button.disabled = true;
            try {
                const candidateKey = key || getApiKey();
                const auth = await validateApiKeyBeforeSave(candidateKey);
                await saveProviderSettings(root, "settings");
                storeValidatedApiKey(candidateKey, auth);
                setBool(STORAGE.enabled, root.querySelector("#emu-caller-enabled")?.checked !== false);
                setBool(STORAGE.autoSort, Boolean(root.querySelector("#emu-caller-sort")?.checked));
                setBool(STORAGE.autoList, root.querySelector("#emu-caller-list")?.checked !== false);
                setBool(STORAGE.allianceBlocker, root.querySelector("#emu-caller-alliance-blocker")?.checked !== false);
                setBool(STORAGE.openMarketEnabled, root.querySelector("#emu-caller-openmarket-enabled")?.checked !== false);
                setBool(STORAGE.openMarketItemMarket, root.querySelector("#emu-caller-openmarket-itemmarket")?.checked !== false);
                setBool(STORAGE.openMarketAuctionHouse, root.querySelector("#emu-caller-openmarket-auction")?.checked !== false);
                setBool(STORAGE.openMarketBazaar, root.querySelector("#emu-caller-openmarket-bazaar")?.checked !== false);
                setValue(STORAGE.speedMode, root.querySelector("#emu-caller-speed")?.value || "PI");
                state.lastError = "";
                state.bspError = "";
                state.settingsEditing = false;
                syncState();
                sendHeartbeat();
                renderPanel();
                scanSoon(0);
            } catch (err) {
                state.lastError = `API key not saved: ${friendlyError(err)}`;
                showToast(state.lastError);
                renderPanel();
            } finally {
                button.disabled = false;
            }
        });
        root.querySelector("[data-clear-cache]")?.addEventListener("click", () => {
            setValue(STORAGE.lastState, "");
            setValue(STORAGE.bspCache, "");
            setValue(STORAGE.factionProfileCache, "");
            setValue(STORAGE.warStatusCache, "");
            setValue(STORAGE.pinnedTargets, "[]");
            state.calls.clear();
            state.pinnedTargets.clear();
            state.bspPredictions.clear();
            state.factionProfiles.clear();
            state.warStatusById.clear();
            state.warStatusFetchedAt.clear();
            state.warStatusRosterKey.clear();
            state.warStatusPending.clear();
            state.exactWarStatusRefreshes.clear();
            state.bspRosterKey = "";
            state.bspLastFetch = 0;
            state.bspError = "";
            state.openMarketError = "";
            state.targetMetaRevision += 1;
            renderPanel();
            refreshMountedStatusTimers();
            scanSoon(0);
        });
        root.querySelector("[data-update-companion]")?.addEventListener("click", () => {
            openCompanionUpdate();
        });
        root.querySelector("[data-sync-now]")?.addEventListener("click", () => {
            syncState();
            Promise.resolve(loadActiveWarOpponent(true))
                .then(() => loadFactionProfiles(true))
                .catch(() => { });
            scanSoon(0);
        });
        root.querySelector("[data-open-war-room]")?.addEventListener("click", () => {
            openCallerAttack(`${DASHBOARD_ORIGIN}/?page=war`);
        });
        root.querySelector("[data-chain-target]")?.addEventListener("click", () => {
            openChainTarget();
        });
        root.querySelector("[data-favourite-target]")?.addEventListener("click", () => {
            openFavoriteTarget();
        });
        root.querySelectorAll("[data-uncall]").forEach(button => {
            button.addEventListener("click", () => uncallTarget(Number(button.dataset.uncall)));
        });
    }

    async function saveProviderSettings() {
        return true;
    }

    async function sendFactionAnnouncement(message, button) {
        message = String(message || "").replace(/\s+/g, " ").trim();
        if (!message) {
            showToast("Type a faction announcement first.");
            return;
        }
        if (state.announcementPending) return;
        state.announcementPending = true;
        if (button) {
            button.disabled = true;
            button.textContent = "Sending...";
        }
        try {
            const data = await apiRequest("/api/emu-caller/announcement", { message }, "POST");
            const announcementId = String(data?.announcement?.id || "");
            if (announcementId) {
                const seen = readSeenAnnouncements();
                seen.add(announcementId);
                writeSeenAnnouncements(seen);
            }
            state.announcementDraft = "";
            state.lastError = "";
            showToast("Faction announcement sent.");
            syncState().catch(() => { });
        } catch (err) {
            state.lastError = `Announcement failed: ${friendlyError(err)}`;
            showToast(state.lastError);
        } finally {
            state.announcementPending = false;
            state.panelMarkup = "";
            state.panelMarkupTab = "";
            const composer = document.querySelector(".emu-caller-announcement-composer");
            const textarea = composer?.querySelector("[data-announcement-message]");
            const sendButton = composer?.querySelector("[data-send-announcement]");
            if (textarea) textarea.value = state.announcementDraft;
            if (sendButton) {
                sendButton.textContent = "Send announcement";
                sendButton.disabled = !(getApiKey() && state.announcementPermissionKnown && state.canAnnounce);
            }
            renderPanel();
        }
    }

    async function updateWarBrief(message, clear, button) {
        if (state.warBriefPending) return;
        message = String(message || "").replace(/\s+/g, " ").trim();
        if (!clear && !message) {
            showToast("Type a war brief first.");
            return;
        }
        state.warBriefPending = true;
        if (button) button.disabled = true;
        try {
            if (!clear && !state.activeRankedWarId) await loadActiveWarOpponent(true);
            const opponent = state.warOpponent || {};
            const data = await apiRequest("/api/emu-caller/war-brief", {
                message,
                clear: Boolean(clear),
                rankedWarId: state.activeRankedWarId || "",
                opponentId: Number(opponent.id || 0) || null,
                opponentName: String(opponent.name || "")
            }, "POST");
            state.warBrief = data?.warBrief && typeof data.warBrief === "object" ? data.warBrief : null;
            state.warBriefDraft = state.warBrief?.message || "";
            state.warBriefEditing = false;
            const briefId = String(state.warBrief?.id || "");
            if (briefId) {
                const seen = readSeenWarBriefs();
                seen.add(briefId);
                writeSeenWarBriefs(seen);
            }
            state.lastError = "";
            showToast(clear ? "War brief cleared." : "War brief updated for your faction.");
            syncState().catch(() => { });
        } catch (err) {
            state.lastError = `War brief failed: ${friendlyError(err)}`;
            showToast(state.lastError);
        } finally {
            state.warBriefPending = false;
            state.panelMarkup = "";
            state.panelMarkupTab = "";
            renderPanel();
        }
    }

    async function validateApiKeyBeforeSave(candidateKey) {
        const key = String(candidateKey || "").trim();
        if (!isLikelyApiKey(key)) throw new Error("Enter a valid Custom or Full Access Torn API key.");
        const auth = await apiRequest("/api/dashboard/auth-check", { apiKey: key }, "POST", key);
        if (auth?.allowed !== true) throw new Error(auth?.error || auth?.message || "This key is not approved for EmuControl Companion.");
        return auth;
    }

    function storeValidatedApiKey(key, auth) {
        const previousKey = getApiKey();
        const nextKey = String(key || "").trim();
        if (!nextKey) return;
        setValue(STORAGE.apiKey, nextKey);
        if (previousKey !== nextKey) {
            setValue(STORAGE.lastState, "");
            setValue(STORAGE.warStatusCache, "");
            state.calls.clear();
            state.rallies = [];
            state.events = [];
            state.membersOnline = [];
            state.memberTelemetryById.clear();
            state.warStatusById.clear();
            state.warStatusFetchedAt.clear();
            state.warStatusRosterKey.clear();
            state.warStatusPending.clear();
            state.exactWarStatusRefreshes.clear();
            state.warOpponent = null;
            state.connected = false;
            state.canAnnounce = false;
            state.announcementPermissionKnown = false;
        }
        if (auth?.owner && typeof auth.owner === "object") state.owner = auth.owner;
        if (auth?.faction && typeof auth.faction === "object") state.faction = auth.faction;
    }

    function fireChainAlert(force) {
        if (force) {
            const overlay = chainFlashOverlay();
            overlay.classList.remove("test");
            void overlay.offsetWidth;
            overlay.classList.add("test");
            window.setTimeout(() => overlay?.classList.remove("test"), 1400);
        } else if (getBool(STORAGE.chainFlash, false)) {
            setChainFlashActive(true);
        }
        if (force || getBool(STORAGE.chainBeep, false)) {
            try {
                const Audio = window.AudioContext || window.webkitAudioContext;
                const context = new Audio();
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                oscillator.frequency.value = 720;
                gain.gain.value = 0.08;
                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.16);
            } catch (err) {
                // Audio alerts are optional and may be blocked until the page is tapped.
            }
        }
    }

    function chainFlashOverlay() {
        let overlay = document.getElementById("emu-caller-chain-flash-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "emu-caller-chain-flash-overlay";
            overlay.setAttribute("aria-hidden", "true");
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function setChainFlashActive(active) {
        const overlay = document.getElementById("emu-caller-chain-flash-overlay");
        if (!active && !overlay) return;
        chainFlashOverlay().classList.toggle("active", Boolean(active));
    }

    function checkChainAlerts() {
        mountTornChainTargetButton();
        if (!getBool(STORAGE.enabled, true)) {
            setChainFlashActive(false);
            return;
        }
        const flashEnabled = getBool(STORAGE.chainFlash, false);
        const beepEnabled = getBool(STORAGE.chainBeep, false);
        if (!flashEnabled && !beepEnabled) {
            setChainFlashActive(false);
            state.lastChainAlertKey = "";
            return;
        }
        const chain = currentChainAlertSnapshot();
        const hits = Number(chain?.hits || 0);
        const seconds = Math.max(0, Number(chain?.timeout || 0) - Math.floor(Date.now() / 1000));
        const threshold = chainAlertThreshold();
        const danger = Boolean(seconds > 0 && hits >= CHAIN_ALERT_MIN_HITS && seconds <= threshold);
        setChainFlashActive(flashEnabled && danger);
        if (!danger) {
            state.lastChainAlertKey = "";
            return;
        }
        const expiresAt = Math.round(Number(chain.timeout || 0) / 5) * 5;
        const key = `timer:${expiresAt}`;
        if (state.lastChainAlertKey === key) return;
        state.lastChainAlertKey = key;
        if (beepEnabled) fireChainAlert(false);
    }

    function ensureChainSnapshotLoaded() {
        if (state.chainSnapshotLoaded) return;
        state.chainSnapshotLoaded = true;
        try {
            state.chainSnapshot = normalizeChainAlertSnapshot(JSON.parse(String(getValue(STORAGE.chainSnapshot, "")) || "null"));
        } catch (err) {
            state.chainSnapshot = null;
        }
    }

    function normalizeChainAlertSnapshot(value) {
        if (!value || typeof value !== "object") return null;
        const now = Math.floor(Date.now() / 1000);
        const hits = Math.max(0, Number(value.hits ?? value.current ?? 0) || 0);
        let timeout = Number(value.timeout ?? value.expiresAt ?? value.end ?? 0) || 0;
        if (timeout > 0 && timeout <= 300) timeout += now;
        return { hits, timeout: Math.max(0, Math.floor(timeout)), fetchedAt: Number(value.fetchedAt || now) || now };
    }

    function saveChainAlertSnapshot(value) {
        const next = normalizeChainAlertSnapshot(value);
        if (!next) return;
        const previous = state.chainSnapshot;
        state.chainSnapshot = next;
        if (!previous || previous.hits !== next.hits || Math.abs(previous.timeout - next.timeout) > 3) {
            setValue(STORAGE.chainSnapshot, JSON.stringify(next));
        }
    }

    function syncChainState() {
        if (state.chainStateInFlight || !getBool(STORAGE.enabled, true) ||
            (!getBool(STORAGE.chainFlash, false) && !getBool(STORAGE.chainBeep, false) && !visibleChainPanelBody()) || !getApiKey()) return;
        state.chainStateInFlight = true;
        apiRequest("/api/emu-caller/chain-state", null, "GET")
            .then(data => {
                saveChainAlertSnapshot(data);
                state.sharedChainOrder = data?.shared_order && typeof data.shared_order === "object" ? data.shared_order : null;
                checkChainAlerts();
                refreshMountedChainOrder();
            })
            .catch(() => {
                // The exact Torn timer remains available locally on the faction chain page.
            })
            .finally(() => {
                state.chainStateInFlight = false;
            });
    }

    function currentChainAlertSnapshot() {
        ensureChainSnapshotLoaded();
        const now = Math.floor(Date.now() / 1000);
        const exact = findTornChainSnapshot();
        if (exact?.seconds) {
            saveChainAlertSnapshot({ hits: exact.hits, timeout: now + exact.seconds, fetchedAt: now });
        }
        const sidebarHits = findSidebarChainHits();
        const snapshot = state.chainSnapshot;
        if (sidebarHits > 0 && snapshot && sidebarHits > snapshot.hits) {
            saveChainAlertSnapshot({ hits: sidebarHits, timeout: now + 300, fetchedAt: now });
        }
        return state.chainSnapshot;
    }

    function findSidebarChainHits() {
        const link = document.querySelector("#sidebarroot a[href*='/war/chain'],#sidebarroot a[href*='war/chain']");
        const match = compactText(link).match(/\bchain\s*:?\s*([\d,]+)\b/i);
        return match ? Math.max(0, Number(match[1].replace(/,/g, "")) || 0) : 0;
    }

    function parseChainAlertThreshold(value) {
        const text = String(value ?? "").trim();
        const clock = text.match(/^(\d{1,2}):([0-5]\d)$/);
        const seconds = clock ? Number(clock[1]) * 60 + Number(clock[2]) : Number(text);
        const candidate = Number.isFinite(seconds) ? Number(seconds) : 120;
        return CHAIN_ALERT_THRESHOLDS.reduce((best, option) => Math.abs(option - candidate) < Math.abs(best - candidate) ? option : best, 120);
    }

    function chainAlertThreshold() {
        return parseChainAlertThreshold(getValue(STORAGE.chainAlertBelow, "150"));
    }

    function formatChainClock(seconds) {
        seconds = Math.max(0, Math.floor(Number(seconds) || 0));
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    }

    function findChainTimer() {
        const chain = findTornChainSnapshot();
        if (chain?.seconds) return { seconds: chain.seconds, text: chain.text };
        const chainLink = document.querySelector("a[href*='/war/chain']");
        const linkedAncestors = [];
        for (let node = chainLink; node && linkedAncestors.length < 4; node = node.parentElement) linkedAncestors.push(node);
        const candidates = Array.from(new Set([
            ...linkedAncestors,
            ...Array.from(document.querySelectorAll("#sidebarroot [class*='chain'],#sidebarroot [id*='chain'],[class*='chain-timer'],[id*='chain-timer']")).slice(0, 80)
        ]))
            .filter(node => !node.closest("#emu-war-caller-root,#emu-caller-chain-flash-overlay"));
        for (const node of candidates) {
            const text = compactText(node.textContent || "").slice(0, 600);
            if (!/chain/i.test(text)) continue;
            const match = text.match(/chain[\s\S]{0,160}?(\d{1,2}):([0-5]\d)\b/i);
            if (!match) continue;
            const seconds = Number(match[1]) * 60 + Number(match[2]);
            if (seconds <= 300) return { seconds, text };
        }
        return null;
    }

    function findTornChainSnapshot() {
        const mountedHeader = document.querySelector(".emu-caller-torn-chain-header");
        const searchRoot = isFactionChainRoute() ? document : (document.querySelector("#sidebarroot") || document);
        const headings = mountedHeader instanceof HTMLElement
            ? [mountedHeader]
            : Array.from(searchRoot.querySelectorAll("div,span,h1,h2,h3,h4,h5,strong,b"))
                .filter(node => node instanceof HTMLElement && !node.closest("#emu-war-caller-root,#emu-caller-chain-flash-overlay") && normalizedChainHeaderText(node) === "chain active");
        for (const heading of headings) {
            let headerHost = heading;
            for (let depth = 0; headerHost.parentElement && depth < 3; depth += 1) {
                const parent = headerHost.parentElement;
                const text = normalizedChainHeaderText(parent);
                const rect = parent.getBoundingClientRect?.() || {};
                if (text !== "chain active" || (rect.height && rect.height > 54)) break;
                headerHost = parent;
            }
            let card = headerHost;
            for (let depth = 0; card && card !== document.body && depth < 8; depth += 1, card = card.parentElement) {
                if (!(card instanceof HTMLElement) || card.closest("#emu-war-caller-root")) continue;
                const text = compactText(card).slice(0, 900);
                const clockNode = Array.from(card.querySelectorAll("div,span,strong,b,p"))
                    .find(node => /^(\d{1,2}):([0-5]\d)$/.test(compactText(node)));
                const clock = compactText(clockNode).match(/^(\d{1,2}):([0-5]\d)$/);
                if (!clock) continue;
                const seconds = Number(clock[1]) * 60 + Number(clock[2]);
                if (seconds <= 0 || seconds > 300) continue;
                const ordered = text.match(/\b\d[\d,]*\.\d+\s+([\d,]+)\s+(\d{1,2}:[0-5]\d)\b/);
                let hits = ordered ? Number(ordered[1].replace(/,/g, "")) : 0;
                if (!hits) hits = chainHitsNearestTimer(card, clock[0]);
                return { card, header: headerHost, hits, seconds, text };
            }
        }
        return null;
    }

    function normalizedChainHeaderText(node) {
        return compactText(node).replace(/random target|pinned target|favourite/ig, "").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
    }

    function chainHitsNearestTimer(card, clockText) {
        const timerNodes = Array.from(card.querySelectorAll("div,span,strong,b,p"))
            .filter(node => node instanceof HTMLElement && compactText(node) === clockText);
        const timer = timerNodes[0];
        if (!timer) return 0;
        const timerRect = timer.getBoundingClientRect();
        const candidates = Array.from(card.querySelectorAll("div,span,strong,b,p"))
            .map(node => ({ node, text: compactText(node), rect: node.getBoundingClientRect() }))
            .filter(item => /^[\d,]+$/.test(item.text) && item.rect.bottom <= timerRect.top + 4 && Math.abs((item.rect.left + item.rect.right) / 2 - (timerRect.left + timerRect.right) / 2) <= 70)
            .map(item => ({ ...item, value: Number(item.text.replace(/,/g, "")), distance: timerRect.top - item.rect.bottom }))
            .filter(item => item.value > 0)
            .sort((left, right) => left.distance - right.distance || right.value - left.value);
        return candidates[0]?.value || 0;
    }

    function mountTornChainTargetButton() {
        if (!/\/factions\.php$/i.test(String(location.pathname || ""))) return;
        if (document.querySelector(".emu-caller-torn-chain-target") &&
            document.querySelector(".emu-caller-torn-favourite-target")) return;
        const now = Date.now();
        const retryMs = isFactionChainRoute() ? 1000 : 15000;
        if (state.chainTargetLookupAt && now - state.chainTargetLookupAt < retryMs) return;
        state.chainTargetLookupAt = now;
        const chain = findTornChainSnapshot();
        if (!chain?.header) return;
        const host = chain.header;
        host.classList.add("emu-caller-torn-chain-header");
        const link = host.querySelector("a[href],button:not(.emu-caller-torn-chain-target):not(.emu-caller-torn-favourite-target)");
        let anchor = link;
        while (anchor?.parentElement && anchor.parentElement !== host) anchor = anchor.parentElement;

        let randomButton = host.querySelector(":scope > .emu-caller-torn-chain-target");
        if (!randomButton) {
            randomButton = document.createElement("button");
            randomButton.type = "button";
            randomButton.className = "emu-caller-torn-chain-target";
            randomButton.textContent = "Random target";
            randomButton.title = "Open a random chain target";
            randomButton.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                openChainTarget();
            });
            if (anchor?.parentElement === host) host.insertBefore(randomButton, anchor);
            else host.appendChild(randomButton);
        }

        let favoriteButton = host.querySelector(":scope > .emu-caller-torn-favourite-target");
        if (!favoriteButton) {
            favoriteButton = document.createElement("button");
            favoriteButton.type = "button";
            favoriteButton.className = "emu-caller-torn-favourite-target";
            favoriteButton.textContent = "Pinned target";
            favoriteButton.title = "Open a live-checked Target Finder favourite";
            favoriteButton.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                openFavoriteTarget();
            });
            if (anchor?.parentElement === host) host.insertBefore(favoriteButton, anchor);
            else host.appendChild(favoriteButton);
        }
    }

    async function syncState() {
        if (state.sleeping || enterFinishedWarSleep()) return;
        const identityBootstrap = callerIdentityBootstrapPending();
        if (!isOwnCallerRuntimeSurface()) {
            state.connected = false;
            configureCallerSurfacePolling(false);
            return;
        }
        if (state.syncInFlight) return;
        if (identityBootstrap) state.identityBootstrapAttempted = true;
        state.syncInFlight = true;
        try {
            if (!getBool(STORAGE.enabled, true) || !getApiKey()) {
                state.connected = false;
                renderPanel();
                return;
            }
            state.warId = detectWarId();
            try {
                const data = await apiRequest(`/api/emu-caller/state?warId=${encodeURIComponent(state.warId || "unknown")}`, null, "GET");
                applyServerState(data);
                state.connected = true;
                state.lastError = "";
                setValue(STORAGE.lastState, JSON.stringify({ ...data, _emuCachedAt: Date.now() }));
                renderPanel();
                renderAttackPageHint();
            } catch (err) {
                state.connected = false;
                state.lastError = `Network waiting: ${friendlyError(err)}`;
                loadCachedState();
                renderPanel();
            }
        } finally {
            state.syncInFlight = false;
            updateWarTableOwnershipMarker();
            configureCallerSurfacePolling(false);
            if (isOwnCallerRuntimeSurface()) refreshMountedStatusTimers();
        }
    }

    async function syncCallState() {
        if (state.sleeping || !isOwnCallerRuntimeSurface() || state.callStateInFlight) return;
        if (!getBool(STORAGE.enabled, true) || !getApiKey()) return;
        const factionId = Number(state.faction?.id || state.faction?.faction_id || 0);
        if (!factionId) return;
        state.callStateInFlight = true;
        try {
            state.warId = detectWarId();
            const data = await apiRequest(`/api/emu-caller/calls?warId=${encodeURIComponent(state.warId || "active-war")}`, null, "GET");
            applyCallState(data);
            state.connected = true;
        } catch (err) {
            // The full state poll owns visible network errors; fast call sync is best-effort.
        } finally {
            state.callStateInFlight = false;
        }
    }

    async function syncAssistanceState() {
        if (isOwnCallerRuntimeSurface() || state.assistanceInFlight) return;
        if (!getBool(STORAGE.enabled, true) || !getApiKey()) return;
        state.assistanceInFlight = true;
        try {
            const data = await apiRequest("/api/emu-caller/state?warId=active-war", null, "GET");
            if (!data || data.ok === false || isOwnCallerRuntimeSurface()) return;
            const lightweightAttackPage = isAttackPage();
            if (lightweightAttackPage) applyAttackAssistanceState(data);
            else applyServerState(data);
            state.connected = true;
            state.lastError = "";
            setValue(STORAGE.lastState, JSON.stringify({ ...data, _emuCachedAt: Date.now() }));
            if (!lightweightAttackPage) renderPanel();
        } catch (err) {
            // Assistance notifications are best-effort away from the full caller pages.
        } finally {
            state.assistanceInFlight = false;
        }
    }

    async function sendHeartbeat() {
        if (state.sleeping || enterFinishedWarSleep()) return;
        if (isAttackPage()) return;
        if (state.heartbeatInFlight) return;
        state.heartbeatInFlight = true;
        try {
            if (!getBool(STORAGE.enabled, true) || !getApiKey()) return;
            await apiRequest("/api/emu-caller/heartbeat", { source: "pda", version: RUNTIME_VERSION, telemetry: collectOwnTelemetry() }, "POST");
        } catch (err) {
            // Keep quiet; syncState owns visible network status.
        } finally {
            state.heartbeatInFlight = false;
        }
    }

    function loadCachedState() {
        try {
            const cached = JSON.parse(getValue(STORAGE.lastState, "") || "{}");
            if (!cached?.ok) return;
            const cacheIsFresh = Date.now() - Number(cached._emuCachedAt || 0) <= 2 * 60 * 1000;
            applyServerState(cacheIsFresh ? cached : { ...cached, calls: [], rallies: [], events: [], announcements: [], territoryAlerts: [] });
        } catch (err) {
            // Ignore corrupt local state.
        }
    }

    function applyServerState(data) {
        if (!data || data.ok === false) return;
        const previousWarBriefId = String(state.warBrief?.id || "");
        const previousCallSignature = Array.from(state.calls.values())
            .map(call => `${Number(call?.targetId || 0)}:${Number(call?.callerId || 0)}:${callExpiresAt(call)}`)
            .sort()
            .join("|");
        state.owner = data.owner || null;
        state.faction = data.faction || null;
        state.allianceAudience = data.allianceAudience === "emu_family" ? "emu_family" : "nameless_alliance";
        applyAllianceFactionIds(data);
        state.warId = String(data.warId || state.warId || detectWarId());
        const now = Math.floor(Date.now() / 1000);
        state.calls = new Map(
            (Array.isArray(data.calls) ? data.calls : [])
                .filter(call => !callExpiresAt(call) || callExpiresAt(call) > now)
                .map(call => [Number(call.targetId), call])
                .filter(([targetId, call]) => !hospitalCallIsSuppressed(targetId, call))
        );
        state.membersOnline = Array.isArray(data.membersOnline) ? data.membersOnline : [];
        state.memberTelemetryById = new Map(state.membersOnline.map(member => [Number(member?.playerId), member?.telemetry || {}]));
        state.rallies = Array.isArray(data.rallies) ? data.rallies : [];
        state.events = Array.isArray(data.events) ? data.events : [];
        state.announcements = Array.isArray(data.announcements) ? data.announcements : [];
        if (Object.prototype.hasOwnProperty.call(data, "warBrief")) {
            state.warBrief = data.warBrief && typeof data.warBrief === "object" ? data.warBrief : null;
            if (!state.warBriefEditing && String(state.warBrief?.id || "") !== previousWarBriefId) {
                state.warBriefDraft = state.warBrief?.message || "";
            }
        }
        if (Object.prototype.hasOwnProperty.call(data, "warControl")) {
            state.warControl = data.warControl && typeof data.warControl === "object" ? data.warControl : null;
        }
        state.territoryAlerts = Array.isArray(data.territoryAlerts) ? data.territoryAlerts : [];
        if (Object.prototype.hasOwnProperty.call(data, "canAnnounce")) {
            state.announcementPermissionKnown = true;
            state.canAnnounce = data.canAnnounce === true;
        }
        renderRallyNotifications();
        renderFactionAnnouncementNotifications();
        renderWarBriefNotification();
        renderTerritoryEmergencyNotifications();
        renderProfileAllianceProtection();
        renderAllianceAttackWarning();
        refreshMountedCallControls();
        const nextCallSignature = Array.from(state.calls.values())
            .map(call => `${Number(call?.targetId || 0)}:${Number(call?.callerId || 0)}:${callExpiresAt(call)}`)
            .sort()
            .join("|");
        if (previousCallSignature !== nextCallSignature) scanSoon(0);
    }

    function applyCallState(data) {
        if (!data || data.ok === false) return;
        const previousWarControlSignature = warControlSignature(state.warControl);
        const previousCallSignature = Array.from(state.calls.values())
            .map(call => `${Number(call?.targetId || 0)}:${Number(call?.callerId || 0)}:${callExpiresAt(call)}`)
            .sort()
            .join("|");
        state.owner = data.owner || state.owner || null;
        state.faction = data.faction || state.faction || null;
        state.warId = String(data.warId || state.warId || detectWarId());
        if (Object.prototype.hasOwnProperty.call(data, "warControl")) {
            state.warControl = data.warControl && typeof data.warControl === "object" ? data.warControl : null;
        }
        const now = Math.floor(Date.now() / 1000);
        state.calls = new Map(
            (Array.isArray(data.calls) ? data.calls : [])
                .filter(call => !callExpiresAt(call) || callExpiresAt(call) > now)
                .map(call => [Number(call.targetId), call])
                .filter(([targetId, call]) => !hospitalCallIsSuppressed(targetId, call))
        );
        refreshMountedCallControls();
        const nextCallSignature = Array.from(state.calls.values())
            .map(call => `${Number(call?.targetId || 0)}:${Number(call?.callerId || 0)}:${callExpiresAt(call)}`)
            .sort()
            .join("|");
        if (previousCallSignature !== nextCallSignature) scanSoon(0);
        if (previousWarControlSignature !== warControlSignature(state.warControl) && getValue(STORAGE.activeTab, "faction") === "faction") {
            renderPanel();
        }
    }

    function warControlSignature(control) {
        if (!control || typeof control !== "object") return "";
        return [
            String(control.mode || "war"),
            Number(control.own_term_cap || 0),
            Number(control.enemy_term_cap || 0),
            Number(control.updated_at || 0)
        ].join(":");
    }

    function applyAttackAssistanceState(data) {
        if (!data || data.ok === false) return;
        state.owner = data.owner || state.owner || null;
        state.faction = data.faction || state.faction || null;
        state.allianceAudience = data.allianceAudience === "emu_family" ? "emu_family" : "nameless_alliance";
        applyAllianceFactionIds(data);
        state.warId = String(data.warId || state.warId || detectWarId());
        state.rallies = Array.isArray(data.rallies) ? data.rallies : [];
        state.events = Array.isArray(data.events) ? data.events : [];
        renderRallyNotifications();
        renderAttackPageHint();
        renderAllianceAttackWarning();
    }

    function applyAllianceFactionIds(data) {
        if (data && Object.prototype.hasOwnProperty.call(data, "allianceFactionIds")) {
            state.allianceFactionIds = new Set(
                (Array.isArray(data.allianceFactionIds) ? data.allianceFactionIds : [])
                    .map(value => Number(value))
                    .filter(value => Number.isFinite(value) && value > 0)
            );
        }
        const ownFactionId = Number(state.faction?.id || state.faction?.faction_id || 0);
        if (ownFactionId) state.allianceFactionIds.add(ownFactionId);
    }

    function applyAssistanceResponse(data) {
        if (isAttackPage()) applyAttackAssistanceState(data);
        else applyServerState(data);
    }

    function buttonActionKey(targetId, action) {
        return `${Number(targetId || 0)}:${action === "group" ? "group" : "call"}`;
    }

    function buttonCoolingDown(targetId, action) {
        const key = buttonActionKey(targetId, action);
        const until = Number(state.buttonCooldowns.get(key) || 0);
        if (until > Date.now()) return true;
        state.buttonCooldowns.delete(key);
        state.buttonFeedback.delete(key);
        return false;
    }

    function buttonFeedback(targetId, action) {
        return buttonCoolingDown(targetId, action) ? String(state.buttonFeedback.get(buttonActionKey(targetId, action)) || "") : "";
    }

    function beginButtonCooldown(targetId, action, feedback = "...") {
        if (buttonCoolingDown(targetId, action)) return false;
        const key = buttonActionKey(targetId, action);
        state.buttonCooldowns.set(key, Number.MAX_SAFE_INTEGER);
        state.buttonFeedback.set(key, feedback);
        return true;
    }

    function finishButtonCooldown(targetId, action, feedback, duration = BUTTON_COOLDOWN_MS) {
        const key = buttonActionKey(targetId, action);
        state.buttonCooldowns.set(key, Date.now() + duration);
        state.buttonFeedback.set(key, feedback);
        refreshMountedCallControl(targetId);
        window.setTimeout(() => refreshMountedCallControl(targetId), duration + 50);
    }

    async function callTarget(target, mode) {
        if (!target?.id) return;
        const action = mode === "group" ? "group" : "call";
        if (!beginButtonCooldown(target.id, action)) return;
        let availability = callAvailability(target);
        if (action === "call") {
            if (!hasFreshWarStatus(target)) {
                state.buttonFeedback.set(buttonActionKey(target.id, action), "CHECK");
                refreshMountedCallControl(target.id);
                try {
                    await refreshTargetWarStatus(target);
                } catch (err) {
                    finishButtonCooldown(target.id, action, "RETRY", 1500);
                    state.lastError = `Live target check failed: ${friendlyError(err)}`;
                    showToast(state.lastError);
                    return;
                }
            }
            availability = callAvailability(target);
            if (!availability.allowed) {
                finishButtonCooldown(target.id, action, "WAIT", 900);
                state.lastError = availability.reason || "That target cannot be called yet.";
                showToast(state.lastError);
                return;
            }
        }
        refreshMountedCallControl(target.id);
        const payload = {
            warId: state.warId || detectWarId(),
            targetId: target.id,
            targetName: target.name || `Player ${target.id}`,
            status: mode === "group" ? "group" : "called",
            rowStatus: target.status || "",
            hospitalUntil: availability.hospitalUntil || 0,
            source: "emu-war-caller-pda"
        };
        try {
            const data = await apiRequest("/api/emu-caller/call", payload, "POST");
            applyServerState(data);
            finishButtonCooldown(target.id, action, action === "group" ? "SENT" : "CALLED", 350);
            renderPanel();
        } catch (err) {
            const conflict = err?.payload?.conflict === "target-already-called" ? err.payload : null;
            if (conflict) {
                applyCallState({ ...conflict, ok: true });
                const activeCall = state.calls.get(Number(target.id)) || conflict.conflictingCall || null;
                const callerName = String(activeCall?.callerName || "another member");
                finishButtonCooldown(target.id, action, "CLAIMED", 500);
                state.lastError = `${target.name || `Player ${target.id}`} is already called by ${callerName}.`;
                showToast(state.lastError);
            } else {
                finishButtonCooldown(target.id, action, "Try again", 1500);
                state.lastError = `${mode === "group" ? "Group assist" : "Dibs"} failed: ${friendlyError(err)}`;
            }
            renderPanel();
        }
    }

    async function uncallTarget(targetId, action = "call") {
        if (!targetId) return;
        if (!beginButtonCooldown(targetId, action)) return;
        refreshMountedCallControl(targetId);
        try {
            const data = await apiRequest("/api/emu-caller/uncall", { warId: state.warId || detectWarId(), targetId }, "POST");
            applyServerState(data);
            finishButtonCooldown(targetId, action, action === "group" ? "SENT" : "REMOVED", 350);
            renderPanel();
        } catch (err) {
            finishButtonCooldown(targetId, action, "Try again", 1500);
            state.lastError = `Uncall failed: ${friendlyError(err)}`;
            renderPanel();
        }
    }

    function allianceRallyLabel() {
        return state.allianceAudience === "emu_family" ? "Emu Family" : "Alliance";
    }

    function rallyScopeLabel(scope) {
        return scope === "faction" ? "Faction" : allianceRallyLabel();
    }

    function rallyFactionIdentity(rally) {
        const factionId = Number(rally?.factionId || 0);
        const knownNames = {
            34623: "EMU HQ",
            11898: "Viking Emus",
            53808: "Emu-Saders",
            51896: "Emu Order 66",
            48087: "Emu Special Operations Group"
        };
        const knownTags = { 34623: "EMU", 11898: "VK" };
        const name = String(rally?.factionName || knownNames[factionId] || "").trim();
        const tag = String(rally?.factionTag || knownTags[factionId] || "").trim().toUpperCase();
        if (name && tag) return `${name} [${tag}]`;
        if (name) return name;
        if (tag) return `[${tag}]`;
        return factionId ? `Faction ${factionId}` : "Unknown faction";
    }

    function rallyRequestHeading(rally, filled, slots) {
        const allianceScope = String(rally?.scope || "alliance").toLowerCase() !== "faction";
        const scope = allianceScope ? `${allianceRallyLabel().toUpperCase()} HIT` : "FACTION HIT";
        const caller = String(rally?.callerName || "Emu").trim() || "Emu";
        const faction = allianceScope ? ` - ${rallyFactionIdentity(rally)}` : "";
        return `${scope} - ${caller}${faction} - ${filled}/${slots} joined`;
    }

    function isOwnCall(call) {
        const ownerId = Number(state.owner?.id || state.owner?.playerId || 0);
        return Boolean(call && ownerId && Number(call.callerId) === ownerId);
    }

    function callExpiresAt(call) {
        return Number(call?.expiresAt || call?.expires_at || 0);
    }

    function callStateSignature(call) {
        return [
            Number(call?.targetId || 0),
            Number(call?.callerId || 0),
            Number(call?.created_at || 0),
            Number(call?.updated_at || 0),
            callExpiresAt(call)
        ].join(":");
    }

    function suppressHospitalizedCall(targetId, call) {
        targetId = Number(targetId);
        if (!targetId || !call) return;
        state.hospitalizedCallSuppressions.set(targetId, {
            signature: callStateSignature(call),
            until: Date.now() + 45 * 1000
        });
    }

    function hospitalCallIsSuppressed(targetId, call) {
        targetId = Number(targetId);
        const suppression = state.hospitalizedCallSuppressions.get(targetId);
        if (!suppression) return false;
        if (Number(suppression.until || 0) <= Date.now()) {
            state.hospitalizedCallSuppressions.delete(targetId);
            return false;
        }
        if (suppression.signature !== callStateSignature(call)) {
            state.hospitalizedCallSuppressions.delete(targetId);
            return false;
        }
        return true;
    }

    function expireLocalCalls() {
        const now = Math.floor(Date.now() / 1000);
        let changed = false;
        state.calls.forEach((call, targetId) => {
            const expiresAt = callExpiresAt(call);
            if (expiresAt && expiresAt <= now) {
                state.calls.delete(targetId);
                changed = true;
            }
        });
        if (!changed) return;
        refreshMountedCallControls();
        renderPanel();
        scanSoon(0);
    }

    function callAvailability(target) {
        const timing = targetTiming(target);
        const meta = warStatusMetaFor(target?.id, target?.meta || state.targetMeta.get(Number(target?.id)) || {});
        const now = Math.floor(Date.now() / 1000);
        const explicitHospitalUntil = Number(meta.hospitalUntil || 0);
        const inferredHospitalUntil = timing.kind === "hospital"
            && Number.isFinite(Number(timing.seconds))
            && Number(timing.seconds) > 0
            && Number(timing.seconds) < 24 * 60 * 60
            ? now + Number(timing.seconds)
            : 0;
        const hospitalUntil = explicitHospitalUntil || inferredHospitalUntil;
        if (timing.kind === "hospital") {
            const remaining = hospitalUntil ? Math.max(0, hospitalUntil - now) : Number(timing.seconds || 0);
            if (!remaining || remaining > PRECALL_WINDOW_SECONDS) {
                const opensIn = remaining > PRECALL_WINDOW_SECONDS
                    ? formatRemainingSeconds(remaining - PRECALL_WINDOW_SECONDS)
                    : "when the hospital timer is known";
                return {
                    allowed: false,
                    hospitalUntil,
                    reason: `Pre-call opens ${opensIn} before hospital release.`
                };
            }
            return {
                allowed: true,
                hospitalUntil,
                reason: `Pre-call available; releases ${POST_HOSPITAL_CALL_SECONDS / 60} minutes after hospital exit.`
            };
        }
        if (timing.kind === "travel") {
            return { allowed: false, hospitalUntil: 0, reason: "Travelling targets cannot be called." };
        }
        return { allowed: true, hospitalUntil: 0, reason: "Call target." };
    }

    function factionIdForWarTarget(target) {
        const list = target?.row?.closest?.(".members-list");
        const direct = list ? factionIdForWarList(list) : 0;
        if (direct) return Number(direct);
        const refs = detectWarFactionRefs();
        return target?.row?.getAttribute?.("data-emu-caller-native-side") === "own"
            ? Number(refs.own?.id || 0)
            : Number(refs.enemy?.id || 0);
    }

    function hasFreshWarStatus(target) {
        const playerId = Number(target?.id || 0);
        const factionId = factionIdForWarTarget(target);
        const fetchedAt = Number(state.warStatusFetchedAt.get(factionId) || 0);
        return Boolean(
            playerId
            && factionId
            && state.warStatusById.has(playerId)
            && fetchedAt > Date.now() - WAR_STATUS_REFRESH_MS - 1500
        );
    }

    async function refreshTargetWarStatus(target) {
        const playerId = Number(target?.id || 0);
        const factionId = factionIdForWarTarget(target);
        if (!playerId || !factionId) throw new Error("Could not identify the target faction.");
        const warId = state.warId || detectWarId();
        const refreshKey = `${factionId}:${warId}`;
        const now = Date.now();
        let refresh = state.exactWarStatusRefreshes.get(refreshKey);
        if (!refresh || now - Number(refresh.startedAt || 0) > 1250) {
            const params = new URLSearchParams({
                players: String(playerId),
                bsp: "0",
                fresh: "1",
                war_id: warId
            });
            refresh = {
                startedAt: now,
                promise: apiRequest(`/api/war-enhancer/faction/${factionId}?${params.toString()}`, null, "GET")
            };
            state.exactWarStatusRefreshes.set(refreshKey, refresh);
            window.setTimeout(() => {
                if (state.exactWarStatusRefreshes.get(refreshKey) === refresh) {
                    state.exactWarStatusRefreshes.delete(refreshKey);
                }
            }, 1300);
            void refresh.promise.catch(() => {
                if (state.exactWarStatusRefreshes.get(refreshKey) === refresh) {
                    state.exactWarStatusRefreshes.delete(refreshKey);
                }
            });
        }
        const payload = await refresh.promise;
        const member = factionStatusMembers(payload).find(item =>
            Number(item?.id || item?.player_id || item?.playerId || item?.user_id || item?.userId || item?.member_id || item?.memberId || 0) === playerId
        );
        if (!member) throw new Error("The live faction roster did not include that target.");
        const next = new Map();
        mergeTargetMeta(next, playerId, member);
        const meta = { ...(next.get(playerId) || {}), _factionId: factionId, _verifiedAt: Date.now() };
        state.warStatusById.set(playerId, meta);
        state.warStatusFetchedAt.set(factionId, Date.now());
        target.meta = meta;
        target.status = normalizeOperationalStatus(meta.status || meta.travelLabel || "", meta);
        saveWarStatusCache();
        if (target.row?.isConnected) ensureNativeStatusTimer(target.row, playerId, target);
        return meta;
    }

    function liveAttackBlockReason(meta = {}) {
        const timed = timedWarStatus(meta);
        if (timed?.kind === "hospital") return timed.title || "Target is still in hospital.";
        if (timed?.kind === "travel") return timed.title || "Target is still travelling.";
        const status = normalizeOperationalStatus(meta.status || meta.travelLabel || "", meta);
        if (/hosp/i.test(status)) return "Target is still in hospital.";
        if (/travel|abroad|flying|returning/i.test(status)) return "Target is not in Torn.";
        if (/jail|federal|fallen/i.test(status)) return `Target is unavailable (${status}).`;
        return "";
    }

    async function openAttackAfterFreshStatus(target, attackUrl) {
        let pendingTab = null;
        try {
            pendingTab = window.open("about:blank", "_blank");
            if (pendingTab) {
                pendingTab.opener = null;
                pendingTab.document.title = "Checking target...";
                pendingTab.document.body.textContent = "Checking live target status...";
            }
        } catch (err) {
            pendingTab = null;
        }
        try {
            const meta = await refreshTargetWarStatus(target);
            const blocked = liveAttackBlockReason(meta);
            if (blocked) {
                try { pendingTab?.close(); } catch (err) { }
                showToast(blocked);
                return;
            }
            if (pendingTab && !pendingTab.closed) pendingTab.location.replace(attackUrl);
            else window.open(attackUrl, "_blank", "noopener,noreferrer");
        } catch (err) {
            try { pendingTab?.close(); } catch (closeErr) { }
            showToast(`Attack not opened: live target check failed (${friendlyError(err)}).`);
        }
    }

    function isOwnRally(rally) {
        const ownerId = Number(state.owner?.id || state.owner?.playerId || 0);
        return Boolean(rally && (rally.__optimisticOwn === true || (ownerId && Number(rally.callerId) === ownerId)));
    }

    function rallyAssistCount(rally) {
        const requesterId = Number(rally?.callerId || 0);
        const seen = new Set();
        (Array.isArray(rally?.participants) ? rally.participants : []).forEach(participant => {
            const participantId = Number(participant?.id || 0);
            if (requesterId && participantId === requesterId) return;
            const key = participantId ? `id:${participantId}` : `name:${String(participant?.name || "").trim().toLowerCase()}`;
            if (!key.endsWith("name:")) seen.add(key);
        });
        return seen.size;
    }

    function ownActiveRally(targetId) {
        const ownerId = Number(state.owner?.id || state.owner?.playerId || 0);
        const optimistic = state.optimisticRally;
        if (optimistic && Number(optimistic.targetId) === Number(targetId)) return optimistic.cancelRequested ? null : optimistic;
        if (!ownerId || !targetId || !Array.isArray(state.rallies)) return null;
        return state.rallies.find(rally =>
            !state.hiddenRallyIds.has(String(rally?.id || "")) &&
            Number(rally?.targetId) === Number(targetId) &&
            Number(rally?.callerId) === ownerId
        ) || null;
    }

    function activeAssistanceRally(targetId) {
        if (!targetId) return null;
        const optimistic = state.optimisticRally;
        if (optimistic && Number(optimistic.targetId) === Number(targetId)) return optimistic.cancelRequested ? null : optimistic;
        if (!Array.isArray(state.rallies)) return null;
        return state.rallies.find(rally =>
            !state.hiddenRallyIds.has(String(rally?.id || "")) &&
            Number(rally?.targetId) === Number(targetId)
        ) || null;
    }

    function createdRallyFromResponse(data, targetId) {
        const ownerId = Number(state.owner?.id || state.owner?.playerId || 0);
        const rallies = Array.isArray(data?.rallies) ? data.rallies : [];
        return rallies.find(rally =>
            Number(rally?.targetId) === Number(targetId) &&
            (!ownerId || Number(rally?.callerId) === ownerId)
        ) || null;
    }

    async function sendRallyRequest(slots, scope = "alliance", initialTarget = null) {
        const target = initialTarget?.id ? initialTarget : detectAttackTarget();
        if (!target.id) {
            state.lastError = "No attack target found for rally.";
            renderPanel();
            return;
        }
        if (state.rallyPending || Date.now() < state.rallyCooldownUntil) return;
        const targetName = normalizeAttackTargetName(target.name, target.id) || `Player ${target.id}`;
        const cachedBsp = bspValueForId(target.id, null);
        const optimisticRally = {
            id: `pending:${target.id}:${Date.now()}`,
            warId: state.warId || detectWarId(),
            targetId: Number(target.id),
            targetName,
            targetBsp: cachedBsp && cachedBsp !== "--" ? cachedBsp : "",
            slots: Math.max(1, Math.min(5, Number(slots) || 1)),
            scope,
            callerId: Number(state.owner?.id || state.owner?.playerId || 0),
            callerName: String(state.owner?.name || "You"),
            factionId: Number(state.faction?.id || state.faction?.faction_id || 0),
            factionName: String(state.faction?.name || ""),
            participants: [],
            attackUrl: location.href,
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000),
            __optimisticOwn: true,
            cancelRequested: false
        };
        state.optimisticRally = optimisticRally;
        state.rallyPending = true;
        state.rallyCooldownUntil = Number.MAX_SAFE_INTEGER;
        renderAttackPageHint();
        let succeeded = false;
        try {
            const [resolvedTarget, resolvedBsp] = await Promise.all([
                resolveAttackTargetIdentity(target),
                resolveRallyTargetBsp(target.id)
            ]);
            optimisticRally.targetName = normalizeAttackTargetName(resolvedTarget?.name, target.id) || targetName;
            optimisticRally.targetBsp = resolvedBsp && resolvedBsp !== "--" ? resolvedBsp : optimisticRally.targetBsp;
            if (optimisticRally.cancelRequested) {
                succeeded = true;
                state.lastError = "Help request cancelled.";
                return;
            }
            renderAttackPageHint();
            const data = await apiRequest("/api/emu-caller/rally", {
                warId: state.warId || detectWarId(),
                targetId: target.id,
                targetName: optimisticRally.targetName,
                targetBsp: optimisticRally.targetBsp,
                slots,
                scope,
                rowStatus: "",
                attackUrl: location.href,
                source: "emu-war-caller-pda"
            }, "POST");
            if (optimisticRally.cancelRequested) {
                const created = createdRallyFromResponse(data, target.id);
                if (created?.id) {
                    const cancelled = await apiRequest("/api/emu-caller/rally-cancel", {
                        rallyId: created.id,
                        warId: state.warId || detectWarId(),
                        source: "emu-war-caller-pda"
                    }, "POST");
                    applyAssistanceResponse(cancelled);
                } else {
                    applyAssistanceResponse(data);
                }
            } else {
                applyAssistanceResponse(data);
            }
            succeeded = true;
            state.lastError = optimisticRally.cancelRequested
                ? "Help request cancelled."
                : `${rallyScopeLabel(scope)} rally requested: ${slots}x on ${optimisticRally.targetName}.`;
            if (!isAttackPage()) renderPanel();
        } catch (err) {
            state.lastError = `Rally failed: ${friendlyError(err)}`;
            if (!isAttackPage()) renderPanel();
        } finally {
            if (state.optimisticRally === optimisticRally) state.optimisticRally = null;
            state.rallyPending = false;
            state.rallyCooldownUntil = succeeded ? 0 : Date.now() + RALLY_RETRY_COOLDOWN_MS;
            renderAttackPageHint();
            if (!succeeded) window.setTimeout(() => renderAttackPageHint(), RALLY_RETRY_COOLDOWN_MS + 50);
        }
    }

    async function cancelRallyRequest(rallyId) {
        if (!rallyId) return;
        if (state.optimisticRally && String(state.optimisticRally.id) === String(rallyId)) {
            state.optimisticRally.cancelRequested = true;
            renderAttackPageHint();
            return;
        }
        if (state.rallyPending) return;
        state.hiddenRallyIds.add(String(rallyId));
        state.rallyPending = true;
        renderAttackPageHint();
        let succeeded = false;
        try {
            const data = await apiRequest("/api/emu-caller/rally-cancel", {
                rallyId,
                warId: state.warId || detectWarId(),
                source: "emu-war-caller-pda"
            }, "POST");
            applyAssistanceResponse(data);
            succeeded = true;
            state.lastError = "Help request cancelled.";
            if (!isAttackPage()) renderPanel();
        } catch (err) {
            state.lastError = `Cancel failed: ${friendlyError(err)}`;
            if (!isAttackPage()) renderPanel();
        } finally {
            state.hiddenRallyIds.delete(String(rallyId));
            state.rallyPending = false;
            state.rallyCooldownUntil = succeeded ? 0 : Date.now() + RALLY_RETRY_COOLDOWN_MS;
            renderAttackPageHint();
            if (!succeeded) window.setTimeout(() => renderAttackPageHint(), RALLY_RETRY_COOLDOWN_MS + 50);
        }
    }

    async function joinRallyRequest(rally) {
        if (!rally?.id || !rally.attackUrl) return;
        if (isOwnRally(rally)) {
            openCallerAttack(rally.attackUrl);
            return;
        }
        const slots = Math.max(1, Math.min(5, Number(rally.slots) || 1));
        if (rallyAssistCount(rally) >= slots || state.rallyPending) return;
        openCallerAttack(rally.attackUrl);
        state.rallyPending = true;
        renderPanel();
        try {
            const data = await apiRequest("/api/emu-caller/rally-join", {
                rallyId: rally.id,
                warId: state.warId || detectWarId(),
                source: "emu-war-caller-pda"
            }, "POST");
            applyAssistanceResponse(data);
        } catch (err) {
            state.lastError = `Join failed: ${friendlyError(err)}`;
            renderPanel();
        } finally {
            state.rallyPending = false;
        }
    }

    function openCallerAttack(url) {
        url = String(url || "").trim();
        if (!url) return false;
        try {
            if (typeof GM_openInTab === "function") {
                GM_openInTab(url, { active: true, insert: true, setParent: true });
                return true;
            }
        } catch (err) { }
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (opened) {
            try { opened.opener = null; } catch (err) { }
            return true;
        }
        window.location.assign(url);
        return false;
    }

    function saveAttackCallContext(targetId) {
        targetId = Number(targetId);
        if (!targetId) return;
        setValue(STORAGE.attackContext, JSON.stringify({
            targetId,
            warId: state.warId || detectWarId(),
            savedAt: Date.now()
        }));
    }

    function attackCallContext(targetId) {
        try {
            const context = JSON.parse(getValue(STORAGE.attackContext, "") || "null");
            if (Number(context?.targetId || 0) !== Number(targetId || 0)) return null;
            if (Date.now() - Number(context?.savedAt || 0) > 10 * 60 * 1000) return null;
            return context;
        } catch (err) {
            return null;
        }
    }

    function ownsAttackCall(targetId) {
        return isOwnCall(state.calls.get(Number(targetId))) || Boolean(attackCallContext(targetId));
    }

    function clearAttackCallContext(targetId) {
        if (attackCallContext(targetId)) setValue(STORAGE.attackContext, "");
    }

    async function releaseOwnCallAfterAttack(targetId, attempt = 0) {
        targetId = Number(targetId);
        const context = attackCallContext(targetId);
        if (!targetId || state.attackReleaseInFlight.has(targetId) || !ownsAttackCall(targetId)) return false;
        if (attempt === 0 && state.attackReleaseRetryTimers.has(targetId)) return false;
        state.attackReleaseInFlight.add(targetId);
        state.attackCompleteCallReleasedTargetId = targetId;
        refreshMountedCallControls();
        try {
            const data = await apiRequest("/api/emu-caller/uncall", {
                warId: context?.warId || state.warId || detectWarId(),
                targetId,
                source: "emu-war-caller-pda:attack-complete"
            }, "POST");
            applyServerState(data);
            const retryTimer = state.attackReleaseRetryTimers.get(targetId);
            if (retryTimer) clearTimeout(retryTimer);
            state.attackReleaseRetryTimers.delete(targetId);
            clearAttackCallContext(targetId);
            return true;
        } catch (err) {
            state.attackCompleteCallReleasedTargetId = null;
            const retryDelay = ATTACK_RELEASE_RETRY_MS[attempt];
            if (retryDelay && ownsAttackCall(targetId)) {
                const retryTimer = window.setTimeout(() => {
                    state.attackReleaseRetryTimers.delete(targetId);
                    void releaseOwnCallAfterAttack(targetId, attempt + 1);
                }, retryDelay);
                state.attackReleaseRetryTimers.set(targetId, retryTimer);
                state.lastError = `Completed attack detected; call release retry ${attempt + 1}/${ATTACK_RELEASE_RETRY_MS.length} is queued: ${friendlyError(err)}`;
            } else {
                state.attackReleaseRetryTimers.delete(targetId);
                state.lastError = `Completed attack detected, but the call could not be released automatically: ${friendlyError(err)}`;
            }
            return false;
        } finally {
            state.attackReleaseInFlight.delete(targetId);
            renderAttackPageHint();
            scanSoon(0);
        }
    }

    async function logCallerEvent(payload) {
        if (!getBool(STORAGE.enabled, true) || !getApiKey()) return;
        try {
            const data = await apiRequest("/api/emu-caller/event", payload, "POST");
            applyServerState(data);
            renderPanel();
            scanSoon(0);
        } catch (err) {
            state.lastError = `Event log failed: ${friendlyError(err)}`;
            renderPanel();
        }
    }

    function detectAttackTarget() {
        const id = extractPlayerId(location.href)
            || attackTargetIdFromDom()
            || extractPlayerId(document.body?.innerHTML || "");
        const directLink = id ? document.querySelector(`a[href*="profiles.php"][href*="${id}"]`) : null;
        const meta = state.targetMeta.get(Number(id)) || state.warStatusById.get(Number(id)) || {};
        const call = state.calls.get(Number(id));
        const rally = activeAssistanceRally(id);
        const candidates = [
            rally?.targetName,
            call?.targetName,
            meta.name,
            meta.player_name,
            meta.playerName,
            pageDataPlayerName(id),
            directLink?.textContent,
            document.querySelector(`[data-user-id="${id}"],[data-player-id="${id}"]`)?.textContent,
            document.querySelector("[class*='opponent'] [class*='name'],[class*='defender'] [class*='name']")?.textContent,
            document.title
        ];
        const name = candidates.map(value => normalizeAttackTargetName(value, id)).find(Boolean) || (id ? `Player ${id}` : "Target");
        return {
            id,
            name
        };
    }

    function attackTargetIdFromDom() {
        const root = document.querySelector("main,#mainContainer,#mainroot") || document;
        const selector = [
            "[class*='opponent'] a[href*='profiles.php']",
            "[class*='defender'] a[href*='profiles.php']",
            "a[href*='user2ID=']",
            "a[href*='profiles.php?XID=']",
            "[data-user-id]",
            "[data-userid]",
            "[data-player-id]",
            "[data-playerid]"
        ].join(",");
        for (const node of root.querySelectorAll(selector)) {
            if (node.closest("#emu-war-caller-root,#emu-caller-attack-hint,#chatRoot,#sidebarroot,#sidebar")) continue;
            const raw = [
                node.getAttribute("href"),
                node.getAttribute("data-user-id"),
                node.getAttribute("data-userid"),
                node.getAttribute("data-player-id"),
                node.getAttribute("data-playerid")
            ].filter(Boolean).join(" ");
            const id = extractPlayerId(raw) || Number(raw.match(/\b(\d{3,10})\b/)?.[1] || 0);
            if (id) return id;
        }
        return null;
    }

    async function resolveAttackTargetIdentity(target) {
        if (!target?.id) return target || { id: 0, name: "Target" };
        const current = normalizeAttackTargetName(target.name, target.id);
        if (current) return { ...target, name: current };
        try {
            const payload = await apiRequest(`/api/torn/user/${target.id}/profile`, null, "GET");
            const profile = payload?.profile || payload?.user || payload?.data || payload || {};
            const name = normalizeAttackTargetName(profile?.name || profile?.player_name || profile?.playerName, target.id);
            if (name) return { ...target, name };
        } catch (err) {
            // The numeric target remains safe when profile lookup is temporarily unavailable.
        }
        return { ...target, name: `Player ${target.id}` };
    }

    async function resolveRallyTargetBsp(targetId) {
        targetId = Number(targetId);
        if (!targetId) return "";
        let value = bspValueForId(targetId, null);
        if (value && value !== "--") return value;
        const paths = [
            `/api/emubsp/predictions?players=${encodeURIComponent(targetId)}&source=ffscouter&cached_only=1`,
            `/api/emubsp/predictions?players=${encodeURIComponent(targetId)}&source=ffscouter`
        ];
        for (const path of paths) {
            try {
                const result = await apiRequest(path, null, "GET");
                mergeBspPredictions(state.bspPredictions, result, Date.now());
                saveBspCache();
                value = bspValueForId(targetId, null);
                if (value && value !== "--") return value;
            } catch (err) {
                // Try the live provider-backed lookup after a cache miss or temporary failure.
            }
        }
        return "";
    }

    function normalizeAttackTargetName(value, id) {
        let name = cleanWarTableText(value).replace(/^(?:attack(?:ing)?|fight(?:ing)?)\s*[:|-]?\s*/i, "").replace(/\s*[|\u00b7-]\s*Torn(?: City)?\s*$/i, "").trim();
        if (!name || /back\s+to\s+profile/i.test(name) || /^(?:attacking|attack|start fight|primary|secondary|melee|temporary|unknown|torn(?: city)?|target)$/i.test(name)) return "";
        if (id && new RegExp(`^Player\\s+${id}$`, "i").test(name)) return "";
        return name.slice(0, 80);
    }

    function pageDataPlayerName(playerId) {
        playerId = Number(playerId);
        if (!playerId || !state.pageData) return "";
        const seen = new Set();
        let visited = 0;
        const visit = (value, depth = 0) => {
            if (!value || typeof value !== "object" || depth > 7 || visited > 1800 || seen.has(value)) return "";
            seen.add(value);
            visited += 1;
            if (!Array.isArray(value)) {
                const id = Number(value.id || value.player_id || value.playerId || value.user_id || value.userId || value.target_id || value.targetId || 0);
                if (id === playerId) {
                    const name = normalizeAttackTargetName(value.name || value.player_name || value.playerName || value.username || value.target_name || value.targetName, playerId);
                    if (name) return name;
                }
            }
            for (const child of Object.values(value)) {
                const found = visit(child, depth + 1);
                if (found) return found;
            }
            return "";
        };
        return visit(state.pageData);
    }

    function renderRallyNotifications() {
        if (!document.body || !Array.isArray(state.rallies)) return;
        const activeRallyIds = new Set(state.rallies.filter(Boolean).map(rally => String(rally.id || "")).filter(Boolean));
        document.querySelectorAll("#emu-caller-rally-toasts [data-emu-caller-rally-id]").forEach(toast => {
            if (!activeRallyIds.has(String(toast.dataset.emuCallerRallyId || ""))) toast.remove();
        });
        const ownerId = Number(state.owner?.id || state.owner?.playerId || 0);
        const now = Math.floor(Date.now() / 1000);
        const seen = readSeenRallies();
        const fresh = state.rallies
            .filter(rally => rally && rally.id && !seen.has(String(rally.id)))
            .filter(rally => Number(rally.callerId || 0) !== ownerId)
            .filter(rally => now - Number(rally.updated_at || rally.created_at || 0) <= 600)
            .slice(0, 3);
        if (!fresh.length) return;
        const host = ensureNotificationHost();
        fresh.forEach(rally => {
            seen.add(String(rally.id));
            const filled = rallyAssistCount(rally);
            const slots = Math.max(1, Math.min(5, Number(rally.slots) || 1));
            const full = filled >= slots;
            const toast = document.createElement("div");
            toast.className = `emu-caller-rally-toast scope-${String(rally.scope || "alliance").toLowerCase() === "faction" ? "faction" : "alliance"}`;
            toast.dataset.emuCallerRallyId = String(rally.id);
            toast.innerHTML = `
        <div class="emu-caller-toast-drag-handle" title="Drag notifications">&#8942;&#8942; Drag notifications</div>
        <strong>${escapeHtml(rallyRequestHeading(rally, filled, slots))}</strong>
        <span>${rallyTargetSummary(rally)}</span>
        ${rally.rowStatus ? `<small>${escapeHtml(rally.rowStatus)}</small>` : ""}
        <div>
          ${rally.attackUrl ? `<button type="button" data-join-rally="${escapeAttr(rally.id)}" ${full ? "disabled" : ""}>${full ? "Full" : "Attack now"}</button>` : ""}
          <button type="button" data-dismiss-rally>Dismiss</button>
        </div>
      `;
            toast.querySelector("[data-join-rally]")?.addEventListener("click", event => {
                event.preventDefault();
                joinRallyRequest(rally);
            });
            toast.querySelector("[data-dismiss-rally]")?.addEventListener("click", () => toast.remove());
            host.appendChild(toast);
            window.setTimeout(() => toast.remove(), 25000);
        });
        writeSeenRallies(seen);
    }

    function renderFactionAnnouncementNotifications() {
        if (!document.body || !Array.isArray(state.announcements)) return;
        const ownerId = Number(state.owner?.id || state.owner?.playerId || 0);
        const now = Math.floor(Date.now() / 1000);
        const visibleAnnouncementIds = new Set(state.announcements
            .filter(announcement => announcement && announcement.id && now - Number(announcement.created_at || 0) <= ANNOUNCEMENT_VISIBLE_SECONDS)
            .map(announcement => String(announcement.id)));
        document.querySelectorAll("#emu-caller-rally-toasts [data-emu-caller-announcement-id]").forEach(toast => {
            if (!visibleAnnouncementIds.has(String(toast.dataset.emuCallerAnnouncementId || ""))) toast.remove();
        });
        const seen = readSeenAnnouncements();
        const fresh = state.announcements
            .filter(announcement => announcement && announcement.id && !seen.has(String(announcement.id)))
            .filter(announcement => Number(announcement.senderId || 0) !== ownerId)
            .filter(announcement => now - Number(announcement.created_at || 0) <= ANNOUNCEMENT_VISIBLE_SECONDS)
            .slice(0, 3);
        if (!fresh.length) return;
        const host = ensureNotificationHost();
        fresh.forEach(announcement => {
            const announcementId = String(announcement.id);
            const updateAnnouncement = Boolean(announcement.system)
                && /^system-update:(?:emu|nameless):[0-9]+(?:\.[0-9]+)*$/i.test(announcementId);
            const alreadyMounted = Array.from(host.querySelectorAll(".emu-caller-announcement-toast"))
                .some(node => node.dataset.emuCallerAnnouncementId === announcementId);
            if (alreadyMounted) return;
            const toast = document.createElement("div");
            toast.className = "emu-caller-rally-toast emu-caller-announcement-toast scope-faction";
            toast.dataset.emuCallerAnnouncementId = announcementId;
            toast.innerHTML = `
        <div class="emu-caller-toast-drag-handle" title="Drag notifications">&#8942;&#8942; Drag notifications</div>
        <strong>${updateAnnouncement ? "COMPANION UPDATE AVAILABLE" : "FACTION ANNOUNCEMENT"}</strong>
        <span>${escapeHtml(announcement.message || "")}</span>
        ${updateAnnouncement ? `<small class="emu-caller-update-guidance">${escapeHtml(companionUpdateGuidance())}</small>` : ""}
        <small>Faction only &middot; ${escapeHtml(announcement.senderName || "Faction admin")} &middot; ${timeAgo(announcement.created_at)}</small>
        <div>${updateAnnouncement ? `<button type="button" data-install-announcement-update>Update Script</button>` : ""}<button type="button" data-dismiss-announcement>Dismiss</button></div>
      `;
            toast.querySelector("[data-install-announcement-update]")?.addEventListener("click", event => {
                event.preventDefault();
                openCompanionUpdate();
            });
            toast.querySelector("[data-dismiss-announcement]")?.addEventListener("click", () => {
                seen.add(announcementId);
                writeSeenAnnouncements(seen);
                toast.remove();
            });
            host.appendChild(toast);
        });
    }

    function renderWarBriefNotification() {
        const brief = state.warBrief && typeof state.warBrief === "object" ? state.warBrief : null;
        const briefId = String(brief?.id || "");
        if (!document.body || !briefId) return;
        const seen = readSeenWarBriefs();
        if (seen.has(briefId)) return;
        const host = ensureNotificationHost();
        if (Array.from(host.querySelectorAll("[data-emu-caller-war-brief-id]"))
            .some(node => String(node.dataset.emuCallerWarBriefId || "") === briefId)) return;
        const toast = document.createElement("div");
        toast.className = "emu-caller-rally-toast emu-caller-war-brief-toast scope-faction";
        toast.dataset.emuCallerWarBriefId = briefId;
        toast.innerHTML = `
      <div class="emu-caller-toast-drag-handle" title="Drag notifications">&#8942;&#8942; Drag notifications</div>
      <strong>WAR BRIEF UPDATED</strong>
      <span>Check the Companion Faction tab.</span>
      <small>${escapeHtml(brief.senderName || "Faction admin")} &middot; ${timeAgo(brief.updated_at || brief.created_at)}</small>
      <div><button type="button" data-view-war-brief>View brief</button><button type="button" data-dismiss-war-brief>Dismiss</button></div>
    `;
        const markSeen = () => {
            seen.add(briefId);
            writeSeenWarBriefs(seen);
        };
        toast.querySelector("[data-view-war-brief]")?.addEventListener("click", () => {
            markSeen();
            setValue(STORAGE.activeTab, "faction");
            setBool(STORAGE.panelOpen, true);
            setBool(STORAGE.universalCollapsed, false);
            toast.remove();
            renderPanel();
        });
        toast.querySelector("[data-dismiss-war-brief]")?.addEventListener("click", () => {
            markSeen();
            toast.remove();
        });
        host.appendChild(toast);
        markSeen();
    }

    function renderTerritoryEmergencyNotifications() {
        if (!document.body || !Array.isArray(state.territoryAlerts)) return;
        const activeAlertIds = new Set(
            state.territoryAlerts
                .filter(alert => alert && alert.id)
                .map(alert => String(alert.id))
        );
        document.querySelectorAll("#emu-caller-rally-toasts [data-emu-caller-territory-id]").forEach(toast => {
            if (!activeAlertIds.has(String(toast.dataset.emuCallerTerritoryId || ""))) toast.remove();
        });

        const seen = readSeenTerritoryAlerts();
        const fresh = state.territoryAlerts
            .filter(alert => alert && alert.id && !seen.has(String(alert.id)))
            .slice(0, 3);
        if (!fresh.length) return;

        const host = ensureNotificationHost();
        fresh.forEach(alert => {
            const alertId = String(alert.id);
            if (Array.from(host.querySelectorAll("[data-emu-caller-territory-id]"))
                .some(node => node.dataset.emuCallerTerritoryId === alertId)) return;
            const aggressor = alert.aggressor && typeof alert.aggressor === "object" ? alert.aggressor : {};
            const defender = alert.defender && typeof alert.defender === "object" ? alert.defender : {};
            const target = Math.max(0, Number(alert.target || 0));
            const territory = String(alert.territory || "Unknown TT");
            const viewPath = String(alert.viewPath || `/?page=territory&war=${encodeURIComponent(String(alert.warId || ""))}`).trim();
            const viewUrl = `${DASHBOARD_ORIGIN}${viewPath.startsWith("/") ? viewPath : `/${viewPath}`}`;
            const scoreLine = target
                ? `${formatTerritoryScore(aggressor.score)} - ${formatTerritoryScore(defender.score)} | Target ${formatTerritoryScore(target)}`
                : `${formatTerritoryScore(aggressor.score)} - ${formatTerritoryScore(defender.score)}`;
            const toast = document.createElement("div");
            toast.className = "emu-caller-rally-toast emu-caller-territory-toast";
            toast.dataset.emuCallerTerritoryId = alertId;
            toast.innerHTML = `
        <div class="emu-caller-toast-drag-handle" title="Drag notifications">&#8942;&#8942; Drag notifications</div>
        <strong>TERRITORY EMERGENCY</strong>
        <span>${territoryFactionMarkup(aggressor)} is assaulting ${territoryFactionMarkup(defender)}</span>
        <small>${escapeHtml(territory)} &middot; ${escapeHtml(scoreLine)}</small>
        <div>
          <button type="button" data-view-territory>Click here to view</button>
          <button type="button" data-dismiss-territory>Dismiss</button>
        </div>
      `;
            toast.querySelector("[data-view-territory]")?.addEventListener("click", event => {
                event.preventDefault();
                openCallerAttack(viewUrl);
                toast.remove();
            });
            toast.querySelector("[data-dismiss-territory]")?.addEventListener("click", () => toast.remove());
            host.appendChild(toast);
            seen.add(alertId);
        });
        writeSeenTerritoryAlerts(seen);
    }

    function territoryFactionMarkup(faction) {
        const relation = faction?.isAlliance === true ? "alliance" : "enemy";
        return `<span class="emu-caller-territory-faction ${relation}">${escapeHtml(faction?.name || "Unknown faction")}</span>`;
    }

    function formatTerritoryScore(value) {
        const number = Number(value || 0);
        return (Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0).toLocaleString();
    }

    function readSeenTerritoryAlerts() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE.seenTerritoryAlerts) || "[]");
            return new Set(Array.isArray(value) ? value.map(String) : []);
        } catch (err) {
            return new Set();
        }
    }

    function writeSeenTerritoryAlerts(seen) {
        try {
            localStorage.setItem(STORAGE.seenTerritoryAlerts, JSON.stringify(Array.from(seen).slice(-120)));
        } catch (err) {
            // Local seen markers are optional.
        }
    }

    function readSeenAnnouncements() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE.seenAnnouncements) || "[]");
            return new Set(Array.isArray(value) ? value.map(String) : []);
        } catch (err) {
            return new Set();
        }
    }

    function readSeenWarBriefs() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE.seenWarBriefs) || "[]");
            return new Set(Array.isArray(value) ? value.map(String) : []);
        } catch (err) {
            return new Set();
        }
    }

    function writeSeenWarBriefs(seen) {
        try {
            localStorage.setItem(STORAGE.seenWarBriefs, JSON.stringify(Array.from(seen).slice(-40)));
        } catch (err) {
            // Local seen markers are optional.
        }
    }

    function writeSeenAnnouncements(seen) {
        try {
            localStorage.setItem(STORAGE.seenAnnouncements, JSON.stringify(Array.from(seen).slice(-80)));
        } catch (err) {
            // Local seen markers are optional.
        }
    }

    function readSeenRallies() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE.seenRallies) || "[]");
            return new Set(Array.isArray(value) ? value.map(String) : []);
        } catch (err) {
            return new Set();
        }
    }

    function writeSeenRallies(seen) {
        try {
            localStorage.setItem(STORAGE.seenRallies, JSON.stringify(Array.from(seen).slice(-80)));
        } catch (err) {
            // Local seen markers are optional.
        }
    }

    function ensureNotificationHost() {
        let host = document.getElementById("emu-caller-rally-toasts");
        if (!host) {
            host = document.createElement("div");
            host.id = "emu-caller-rally-toasts";
            document.body.appendChild(host);
        }
        bindMovableNotificationHost(host);
        window.requestAnimationFrame(() => applyStoredNotificationPosition(host));
        return host;
    }

    function bindMovableNotificationHost(host) {
        if (!(host instanceof HTMLElement) || host.dataset.emuCallerDragBound === "true") return;
        host.dataset.emuCallerDragBound = "true";
        let drag = null;
        host.addEventListener("pointerdown", event => {
            if (!event.target.closest(".emu-caller-toast-drag-handle") || (Number.isFinite(event.button) && event.button > 0)) return;
            const rect = host.getBoundingClientRect();
            drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, moved: false };
            try { host.setPointerCapture(event.pointerId); } catch (err) { }
        });
        host.addEventListener("pointermove", event => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;
            if (!drag.moved && Math.hypot(dx, dy) < 6) return;
            drag.moved = true;
            host.dataset.emuCallerDragging = "true";
            setNotificationHostPosition(host, drag.left + dx, drag.top + dy);
            if (event.cancelable) event.preventDefault();
        });
        const finishDrag = event => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            const moved = drag.moved;
            drag = null;
            delete host.dataset.emuCallerDragging;
            try { host.releasePointerCapture(event.pointerId); } catch (err) { }
            if (!moved) return;
            const rect = host.getBoundingClientRect();
            try {
                localStorage.setItem(STORAGE.notificationPosition, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
            } catch (err) { }
            if (event.cancelable) event.preventDefault();
        };
        host.addEventListener("pointerup", finishDrag);
        host.addEventListener("pointercancel", finishDrag);
        window.addEventListener("resize", () => applyStoredNotificationPosition(host), { passive: true });
    }

    function setNotificationHostPosition(host, left, top) {
        if (!(host instanceof HTMLElement)) return;
        const rect = host.getBoundingClientRect();
        const width = Math.min(Math.max(rect.width || 280, 180), Math.max(180, window.innerWidth - 8));
        const height = Math.min(Math.max(rect.height || 80, 40), Math.max(40, window.innerHeight - 8));
        const nextLeft = Math.max(4, Math.min(Number(left) || 4, Math.max(4, window.innerWidth - width - 4)));
        const nextTop = Math.max(4, Math.min(Number(top) || 4, Math.max(4, window.innerHeight - height - 4)));
        host.classList.add("notification-positioned");
        host.style.setProperty("left", `${Math.round(nextLeft)}px`);
        host.style.setProperty("top", `${Math.round(nextTop)}px`);
        host.style.setProperty("right", "auto");
        host.style.setProperty("bottom", "auto");
    }

    function applyStoredNotificationPosition(host) {
        if (!(host instanceof HTMLElement) || !host.isConnected) return;
        try {
            const position = JSON.parse(localStorage.getItem(STORAGE.notificationPosition) || "null");
            if (Number.isFinite(Number(position?.left)) && Number.isFinite(Number(position?.top))) {
                setNotificationHostPosition(host, Number(position.left), Number(position.top));
            }
        } catch (err) { }
    }

    function captureViewportAnchor(scope = document) {
        if (!(scope instanceof Element || scope === document)) return null;
        const candidates = Array.from(scope.querySelectorAll(
            ".faction-war .members-list .table-row,.faction-war .members-list li.enemy,.faction-war .members-list li.your,main button:not([disabled]),main a[href],#mainContainer button:not([disabled]),#mainContainer a[href]"
        )).filter(node => {
            if (!(node instanceof HTMLElement) || node.closest("#emu-war-caller-root,#emu-caller-attack-hint,#emu-caller-rally-toasts")) return false;
            const rect = node.getBoundingClientRect();
            return rect.height > 0 && rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
        });
        const node = candidates.sort((left, right) =>
            Math.abs(left.getBoundingClientRect().top - window.innerHeight * 0.45)
            - Math.abs(right.getBoundingClientRect().top - window.innerHeight * 0.45)
        )[0];
        if (!(node instanceof HTMLElement)) return null;
        return { node, top: node.getBoundingClientRect().top, scrollY: window.scrollY };
    }

    function restoreViewportAnchor(anchor) {
        if (!anchor?.node?.isConnected || Math.abs(window.scrollY - Number(anchor.scrollY || 0)) > 24) return;
        const delta = anchor.node.getBoundingClientRect().top - Number(anchor.top || 0);
        if (!Number.isFinite(delta) || Math.abs(delta) < 0.5 || Math.abs(delta) > window.innerHeight) return;
        window.scrollBy(0, delta);
        anchor.scrollY = window.scrollY;
    }

    function preserveViewportAnchor(mutator, scope = document) {
        const anchor = captureViewportAnchor(scope);
        const result = mutator();
        restoreViewportAnchor(anchor);
        if (anchor) window.requestAnimationFrame(() => restoreViewportAnchor(anchor));
        return result;
    }

    function isHospitalViewPage() {
        const path = String(location.pathname || "").toLowerCase();
        if (/\/hospitalview\.php$/.test(path)) return true;
        try {
            const url = new URL(location.href);
            return String(url.searchParams.get("sid") || "").toLowerCase() === "hospital";
        } catch (err) {
            return /[?&]sid=hospital(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function pennywiseReviveMountPoint() {
        return document.querySelector("#top-page-links-list")
            || document.querySelector("[class*='content-title'] [class*='links'],[class*='contentTitle'] [class*='links']")
            || document.querySelector("main h4,main h3,#mainContainer h4,#mainContainer h3")?.parentElement
            || null;
    }

    function mountPennywiseReviveButton() {
        const existing = document.getElementById("emu-caller-quick-revive");
        if (!isHospitalViewPage() || !getBool(STORAGE.enabled, true)) {
            existing?.remove();
            return false;
        }
        if (existing) return true;
        const host = pennywiseReviveMountPoint();
        if (!(host instanceof Element)) return false;
        const button = document.createElement("button");
        button.id = "emu-caller-quick-revive";
        button.type = "button";
        button.dataset.state = "idle";
        button.textContent = "Pennywise Revives - Click Here";
        button.setAttribute("aria-label", "Request a revive from Pennywise Medical");
        button.title = "Request a Pennywise Medical revive";
        button.addEventListener("click", requestPennywiseRevive);
        host.appendChild(button);
        return true;
    }

    function setPennywiseReviveButtonState(button, nextState, label) {
        if (!(button instanceof HTMLButtonElement)) return;
        button.dataset.state = nextState;
        button.textContent = label;
        button.disabled = nextState !== "idle";
    }

    async function resolvePennywiseRequesterId() {
        let ownerId = Number(state.owner?.id || state.owner?.player_id || state.owner?.user_id || 0);
        if (ownerId) return ownerId;
        if (!getApiKey()) throw new Error("Save your Torn API key in Companion Settings first.");
        const data = await apiRequest("/api/emu-caller/state?warId=active-war", null, "GET");
        ownerId = Number(data?.owner?.id || data?.owner?.player_id || data?.owner?.user_id || 0);
        if (!ownerId) throw new Error("Companion could not confirm your Torn player ID.");
        state.owner = data.owner;
        if (data.faction) state.faction = data.faction;
        return ownerId;
    }

    function sendPennywiseReviveRequest(userId, requesterId) {
        const payload = JSON.stringify({ userId: Number(userId), requesterId: Number(requesterId) });
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== "function") {
                reject(new Error("This script engine cannot contact Pennywise Medical."));
                return;
            }
            GM_xmlhttpRequest({
                method: "POST",
                url: PENNYWISE_REVIVE_API,
                responseType: "text",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                data: payload,
                timeout: 15000,
                onload: response => {
                    const status = Number(response?.status || 0);
                    let body = {};
                    try { body = JSON.parse(String(response?.responseText || response?.response || "{}")); } catch (err) { }
                    if (status === 200 && body?.ok === true) resolve(body);
                    else reject(new Error(body?.error || body?.message || `Pennywise returned HTTP ${status || "unknown"}.`));
                },
                onerror: () => reject(new Error("Could not reach Pennywise Medical.")),
                ontimeout: () => reject(new Error("Pennywise Medical timed out."))
            });
        });
    }

    async function requestPennywiseRevive(event) {
        const button = event?.currentTarget instanceof HTMLButtonElement
            ? event.currentTarget
            : document.getElementById("emu-caller-quick-revive");
        if (!(button instanceof HTMLButtonElement) || state.reviveRequestPending) return;
        const confirmed = window.confirm(
            "Request a revive from Pennywise Medical?\n\n"
            + "Standard (non-war): 1 Xanax or $850,000.\n"
            + "Pennywise uses revivers with a 75% or better success rate.\n"
            + "Contract revive: agreed contract terms apply; ignore the standard payment message."
        );
        if (!confirmed) return;
        state.reviveRequestPending = true;
        setPennywiseReviveButtonState(button, "loading", "Requesting...");
        try {
            const requesterId = await resolvePennywiseRequesterId();
            await sendPennywiseReviveRequest(requesterId, requesterId);
            setPennywiseReviveButtonState(button, "success", "Request Sent");
            showToast("Pennywise Medical revive request sent.");
        } catch (err) {
            setPennywiseReviveButtonState(button, "error", "Request Failed");
            showToast(`Revive request failed: ${friendlyError(err)}`);
        } finally {
            state.reviveRequestPending = false;
            window.setTimeout(() => {
                if (button.isConnected) setPennywiseReviveButtonState(button, "idle", "Pennywise Revives - Click Here");
            }, 6000);
        }
    }

    function scanWarRows() {
        if (state.sleeping || enterFinishedWarSleep()) return;
        mountPennywiseReviveButton();
        if (!getBool(STORAGE.enabled, true)) {
            setChainFlashActive(false);
            return;
        }
        if (isAttackPage()) {
            renderAttackPageHint();
            return;
        }
        updateWarTableOwnershipMarker();
        removeConflictingWarStatsEstimates();
        renderAttackPageHint();
        const foreignWarPage = isForeignActiveRankedWarPage();
        const ownWarPage = isOwnWarPage();
        if (foreignWarPage) {
            configureCallerSurfacePolling(false);
            renderPanel();
            state.targetRows.clear();
            renderWarChainWatcher(null);
            if (state.warListingMounted || document.querySelector("[data-emu-caller-native-row],.emu-caller-row-tools,.emu-caller-bsp-cell")) clearWarRowListing();
            scanForeignWarBspOnly();
            return;
        }
        clearForeignWarBspBadges();
        mountCallerInlinePanel();
        if (!ownWarPage) {
            scanGeneralBspSurfaces();
            state.targetRows.clear();
            renderWarChainWatcher(null);
            if (state.warListingMounted) clearWarRowListing();
            return;
        }
        const rows = collectTargetRows();
        state.targetRows = new Map(rows.map(target => [Number(target.id), target]));
        refreshWarStatusFeed().catch(() => { });
        renderWarChainWatcher(rows);
        if (!getBool(STORAGE.autoList, true)) {
            if (state.warListingMounted) clearWarRowListing();
            return;
        }
        const allMembers = state.warListingMounted
            ? enhanceNativeWarTables(rows)
            : preserveViewportAnchor(() => enhanceNativeWarTables(rows), document.querySelector(".faction-war") || document);
        state.warListingMounted = true;
        refreshEmuBspStats(warBspRoster(allMembers)).catch(() => { });
        applyCallMarkers(rows);
    }

    function removeConflictingWarStatsEstimates() {
        document.querySelectorAll(".faction-war .tt-stats-estimate, #faction_war_list_id .tt-stats-estimate").forEach(node => node.remove());
    }

    function scanGeneralBspSurfaces() {
        const profilePage = isProfileBspPage();
        renderProfileAllianceProtection();
        const listPage = isExpandedBspListPage();
        const targetsListPage = isTargetsListBspPage();
        const companyPage = isCompanyBspPage();
        const hallOfFamePage = isHallOfFameBspPage();
        const advancedSearchPage = isAdvancedSearchBspPage();
        const chainPage = isFactionChainBspPage();
        const russianRoulettePage = isRussianRouletteBspPage();
        const recoveryDisabledDeepPage = hallOfFamePage || advancedSearchPage;
        const foreignWarPage = isForeignActiveRankedWarPage();
        const root = document.getElementById("emu-war-caller-root");
        if (root) {
            const hideRoot = foreignWarPage;
            root.hidden = hideRoot;
            if (hideRoot) root.style.setProperty("display", "none", "important");
            else root.style.removeProperty("display");
        }
        const roster = [];
        const rankedWarRoute = /\/war\/rank/i.test(String(location.hash || ""));
        if (/\/factions\.php/i.test(location.pathname) && !isOwnWarPage() && !rankedWarRoute && isStandardFactionBspPage()) {
            roster.push(...enhanceStandardFactionBspTable());
        }
        if (chainPage) {
            mountTornChainTargetButton();
            roster.push(...enhanceFactionChainBspTags());
        }
        if (russianRoulettePage) roster.push(...enhanceRussianRouletteBspTags());
        else clearRussianRouletteBspTags();
        if (profilePage) {
            const playerId = currentProfileBspPlayerId();
            if (playerId) {
                ensureProfileBspBox(playerId);
                roster.push({ id: playerId, row: null });
            }
        }
        if (companyPage) roster.push(...enhanceCompanyBspTable());
        else if (hallOfFamePage) {
            const hallOfFameRoster = enhanceHallOfFameBspTable();
            roster.push(...hallOfFameRoster);
            document.getElementById("emu-caller-hof-diagnostic")?.remove();
        }
        else if (advancedSearchPage) {
            const advancedRoster = enhanceAdvancedSearchBspTags();
            roster.push(...advancedRoster);
        }
        else if (targetsListPage) roster.push(...enhanceTargetsListBspTags());
        else if (listPage && !recoveryDisabledDeepPage) roster.push(...enhanceExpandedBspLists());
        if (!hallOfFamePage) document.getElementById("emu-caller-hof-diagnostic")?.remove();
        if (roster.length) refreshEmuBspStats(roster, false).catch(() => { });
    }

    function scanForeignWarBspOnly() {
        if (!isForeignActiveRankedWarPage()) return;
        const roster = [];
        const seenRows = new Set();
        const profileSelector = "a[href*='profiles.php'],a[href^='/profiles']";
        document.querySelectorAll(".faction-war .members-list").forEach(list => {
            list.querySelectorAll(profileSelector).forEach(profile => {
                if (!(profile instanceof HTMLElement) || profile.closest("#emu-war-caller-root,[data-emu-caller-native='true']")) return;
                const row = findRow(profile);
                if (!(row instanceof HTMLElement) || !list.contains(row) || seenRows.has(row) || !isVisibleForeignWarRow(row)) return;
                const playerId = warRowPlayerId(row, profile);
                if (!playerId) return;
                seenRows.add(row);
                ensureForeignWarBspBadge(row, profile, playerId);
                roster.push({ id: playerId, row });
            });
        });
        document.querySelectorAll("[data-emu-caller-foreign-bsp-row]").forEach(row => {
            if (!seenRows.has(row) || !isVisibleForeignWarRow(row)) {
                row.querySelectorAll(".emu-caller-foreign-war-bsp-badge").forEach(node => node.remove());
                row.removeAttribute("data-emu-caller-foreign-bsp-row");
            }
        });
        paintForeignWarBspBadges();
        if (roster.length) refreshEmuBspStats(roster, false).catch(() => { });
    }

    function isVisibleForeignWarRow(row) {
        if (!(row instanceof HTMLElement) || !row.isConnected || row.hidden || !row.getClientRects().length) return false;
        const style = getComputedStyle(row);
        return style.display !== "none" && style.visibility !== "hidden";
    }

    function ensureForeignWarBspBadge(row, profile, playerId) {
        if (!(row instanceof HTMLElement) || !(profile instanceof HTMLElement) || !playerId) return null;
        const nextId = String(Number(playerId));
        row.querySelectorAll(".emu-caller-foreign-war-bsp-badge").forEach(node => {
            if (node.dataset.playerId !== nextId) node.remove();
        });
        let badge = row.querySelector(`.emu-caller-foreign-war-bsp-badge[data-player-id="${nextId}"]`);
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "emu-caller-foreign-war-bsp-badge emu-caller-faction-bsp-value";
            badge.dataset.playerId = nextId;
            badge.setAttribute("aria-label", "BSP estimate");
            if (profile.parentElement && profile.parentElement !== row) profile.before(badge);
            else profile.insertBefore(badge, profile.firstChild || null);
        }
        row.dataset.emuCallerForeignBspRow = nextId;
        paintForeignWarBspBadge(badge, Number(playerId));
        return badge;
    }

    function paintForeignWarBspBadge(badge, playerId) {
        if (!(badge instanceof HTMLElement) || !playerId) return;
        const cached = state.bspPredictions.get(Number(playerId)) || {};
        const estimate = bspValueForId(playerId) || "--";
        const total = bspTotalValue(cached, estimate);
        const tier = estimate === "--" ? "pending" : callerBspTier(total, cached);
        if (badge.textContent !== estimate) badge.textContent = estimate;
        badge.dataset.tier = tier;
        badge.title = `EmuControl BSP estimate: ${estimate} | Player ${playerId}`;
    }

    function paintForeignWarBspBadges() {
        document.querySelectorAll(".emu-caller-foreign-war-bsp-badge[data-player-id]").forEach(badge => {
            paintForeignWarBspBadge(badge, Number(badge.dataset.playerId || 0));
        });
    }

    function clearForeignWarBspBadges() {
        document.querySelectorAll(".emu-caller-foreign-war-bsp-badge").forEach(node => node.remove());
        document.querySelectorAll("[data-emu-caller-foreign-bsp-row]").forEach(row => row.removeAttribute("data-emu-caller-foreign-bsp-row"));
    }

    function isProfileBspPage() {
        const path = String(location.pathname || "").toLowerCase();
        if (/\/profiles\.php$/.test(path)) return true;
        if (!/\/(?:page|loader)\.php$/.test(path)) return false;
        try {
            const url = new URL(location.href);
            const sid = String(url.searchParams.get("sid") || "").toLowerCase();
            if (sid === "userprofile" || sid === "profile" || sid === "profiles") return true;
            if (sid && !/profile/.test(sid)) return false;
        } catch (err) { }
        return Array.from(document.querySelectorAll("div,span,h1,h2,h3,h4,h5")).some(node =>
            node instanceof HTMLElement && /^user information$/i.test(compactText(node)) && !node.closest("#emu-war-caller-root")
        );
    }

    function currentProfileBspPlayerId() {
        const sources = [
            location.href,
            document.querySelector("link[rel='canonical']")?.getAttribute("href"),
            document.querySelector("meta[property='og:url']")?.getAttribute("content")
        ];
        for (const source of sources) {
            const playerId = extractPlayerId(source || "");
            if (playerId) return Number(playerId);
            const route = String(source || "").match(/(?:profiles?|userprofile)[\/:=_-]+(\d{3,10})/i);
            if (route) return Number(route[1]);
        }
        return 0;
    }

    function profileAllianceFactionLink() {
        const exact = document.querySelector(".user-info-value a[href*='/factions.php'][href*='ID='],.user-info-value a[href*='factions.php'][href*='ID=']");
        if (exact instanceof HTMLAnchorElement) return exact;
        return Array.from(document.querySelectorAll(".user-information a[href*='/factions.php'],[class*='userInformation'] a[href*='/factions.php']"))
            .find(link => profileFactionIdFromHref(link.href)) || null;
    }

    function profileFactionIdFromHref(href) {
        const raw = String(href || "");
        try {
            const url = new URL(raw, location.origin);
            return Number(url.searchParams.get("ID") || url.searchParams.get("id") || url.searchParams.get("factionID") || 0) || 0;
        } catch (err) {
            return Number(raw.match(/[?&](?:ID|id|factionID|factionId|faction_id)=(\d+)/)?.[1] || 0) || 0;
        }
    }

    function clearProfileAllianceProtection() {
        document.querySelectorAll(".emu-caller-disable-alliance,.emu-caller-profile-alliance-warning").forEach(node => node.remove());
    }

    function renderProfileAllianceProtection() {
        if (!isProfileBspPage()) {
            clearProfileAllianceProtection();
            return;
        }
        const playerId = currentProfileBspPlayerId();
        const ownerId = Number(state.owner?.id || state.owner?.playerId || 0);
        const factionLink = profileAllianceFactionLink();
        const targetFactionId = profileFactionIdFromHref(factionLink?.href || "");
        const ownFactionId = Number(state.faction?.id || state.faction?.faction_id || 0);
        const protectedTarget = Boolean(
            playerId
            && (!ownerId || playerId !== ownerId)
            && targetFactionId
            && state.allianceFactionIds.has(targetFactionId)
        );
        if (!protectedTarget) {
            clearProfileAllianceProtection();
            return;
        }

        const attackButton = document.querySelector(".profile-buttons .profile-button-attack,a.profile-button-attack[href*='sid=attack']");
        if (attackButton instanceof HTMLAnchorElement && !attackButton.querySelector(".tt-disable-ally,.emu-caller-disable-alliance")) {
            const svgNS = "http://www.w3.org/2000/svg";
            const cross = document.createElementNS(svgNS, "svg");
            cross.setAttribute("class", "emu-caller-disable-alliance emu-caller-alliance-cross");
            cross.setAttribute("viewBox", "0 0 30 30");
            cross.setAttribute("fill", "#627e0d");
            cross.setAttribute("height", "30");
            cross.setAttribute("width", "30");
            cross.setAttribute("role", "button");
            cross.setAttribute("aria-label", "Alliance attack warning");
            cross.setAttribute("title", "Blocked by Companion: Alliance member");
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", "M 0 1 L 12.061 15 L 0 29 L 1 30 L 15 18.06 L 29 30 L 30 29 L 17.94 15 L 30 1 L 29 0 L 15 11.94 L 1 0 L 0 1 Z");
            cross.appendChild(path);
            cross.addEventListener("click", event => {
                if (!getBool(STORAGE.allianceBlocker, true)) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                if (window.confirm("Are you sure you want to attack this ally?")) window.open(attackButton.href, "_self");
            }, { capture: true });
            attackButton.insertAdjacentElement("beforeend", cross);
        }

        document.querySelectorAll(".emu-caller-profile-alliance-warning").forEach(node => node.remove());
        if (targetFactionId === ownFactionId) return;
        const header = findCallerProfileBspHost(playerId)?.header
            || Array.from(document.querySelectorAll(".user-information .title-black,[class*='userInformation'] [class*='title']"))
                .find(node => /^user information$/i.test(compactText(node)));
        if (!(header instanceof HTMLElement)) return;
        const warning = document.createElement("span");
        warning.className = "emu-caller-profile-alliance-warning";
        warning.textContent = "This user is in Alliance!";
        header.appendChild(warning);
    }

    function allianceAttackWarningKey() {
        const factionId = Number(state.attackAllianceFactionId || 0);
        if (!factionId) return "";
        const targetId = Number(detectAttackTarget().id || 0);
        return `${targetId || "target"}:${factionId}`;
    }

    function allianceAttackWarningHost() {
        const candidates = Array.from(document.querySelectorAll("[class*='modal__'][class*='defender___']"));
        return candidates.find(node => {
            const player = node.closest("[class*='player___']");
            return Boolean(player?.querySelector("[class*='rose___']"));
        }) || candidates.find(node => node.closest("[class*='playerArea__']")) || null;
    }

    function renderAllianceAttackWarning() {
        const warnings = Array.from(document.querySelectorAll(".emu-caller-disable-alliance-attack"));
        if (!isAttackPage() || !getBool(STORAGE.allianceBlocker, true)) {
            warnings.forEach(node => node.remove());
            return;
        }
        const warningKey = allianceAttackWarningKey();
        const protectedTarget = Boolean(
            warningKey
            && state.attackAllianceViewStyle === "nonAttack"
            && state.allianceFactionIds.has(Number(state.attackAllianceFactionId || 0))
            && state.attackAllianceOverrideKey !== warningKey
        );
        if (!protectedTarget || document.querySelector(".tt-disable-ally-attack")) {
            warnings.forEach(node => node.remove());
            return;
        }
        const host = allianceAttackWarningHost();
        if (!(host instanceof HTMLElement)) return;
        let warning = warnings.find(node => node.parentElement === host && node.dataset.warningKey === warningKey);
        warnings.filter(node => node !== warning).forEach(node => node.remove());
        if (warning) return;
        warning = document.createElement("div");
        warning.className = "emu-caller-disable-alliance-attack";
        warning.dataset.warningKey = warningKey;
        warning.setAttribute("role", "button");
        warning.setAttribute("tabindex", "0");
        warning.textContent = "Blocked by Companion. This player is in your Alliance. Click here if you are sure to attack.";
        const allowAttack = event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!window.confirm("Are you sure you want to attack this ally?")) return;
            state.attackAllianceOverrideKey = warningKey;
            warning.remove();
        };
        warning.addEventListener("click", allowAttack);
        warning.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") allowAttack(event);
        });
        host.insertAdjacentElement("afterbegin", warning);
    }

    function isRussianRouletteBspPage() {
        const path = String(location.pathname || "").toLowerCase();
        if (/\/russianroulette\.php$/.test(path)) return true;
        if (!/\/(?:page|loader)\.php$/.test(path)) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "")
                .replace(/[^a-z]/gi, "")
                .toLowerCase() === "russianroulette";
        } catch (err) {
            return /[?&]sid=russianroulette(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isExpandedBspListPage() {
        const path = String(location.pathname || "").toLowerCase();
        if (/\/(?:joblist|hospitalview|jailview|halloffame)\.php/.test(path)) return true;
        if (!/\/(?:page|loader)\.php$/.test(path)) return /\bhall of fame\b/i.test(String(document.title || ""));
        try {
            const url = new URL(location.href);
            const sid = String(url.searchParams.get("sid") || "").toLowerCase();
            const type = String(url.searchParams.get("type") || "").toLowerCase();
            return sid === "hof" || (sid === "list" && ["friends", "enemies", "targets"].includes(type));
        } catch (err) {
            return /sid=hof|sid=list.*type=(?:friends|enemies|targets)/i.test(location.href);
        }
    }

    function isTargetsListBspPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            const url = new URL(location.href);
            return String(url.searchParams.get("sid") || "").toLowerCase() === "list"
                && String(url.searchParams.get("type") || "").toLowerCase() === "targets";
        } catch (err) {
            return /[?&]sid=list(?:&|$).*?[?&]type=targets(?:&|$)|[?&]type=targets(?:&|$).*?[?&]sid=list(?:&|$)/i.test(location.href);
        }
    }

    function normalizedFactionHash() {
        try {
            return decodeURIComponent(String(location.hash || "")).toLowerCase();
        } catch (err) {
            return String(location.hash || "").toLowerCase();
        }
    }

    function isFactionChainRoute() {
        return /\/factions\.php$/i.test(String(location.pathname || "")) && /\/war\/chain(?:[/?&#]|$)/i.test(normalizedFactionHash());
    }

    function isFactionUtilityTabRoute() {
        return /\/factions\.php$/i.test(String(location.pathname || "")) && /\/tab=[a-z0-9-]+/i.test(normalizedFactionHash());
    }

    function isStandardFactionBspPage() {
        if (!/\/factions\.php$/i.test(String(location.pathname || ""))) return false;
        const route = normalizedFactionHash();
        if (/\/war\/(?:rank|chain)(?:[/?&#]|$)/i.test(route)) return false;
        return !/(?:\/|tab=)(?:armou?ry|controls?|crimes?|rank|territory|upgrades?)(?:[/?&#]|$)/i.test(route);
    }

    function factionChainRecentAttacksRoot() {
        const cached = state.factionChainRecentRoot;
        if (cached instanceof HTMLElement && cached.isConnected) return cached;
        state.factionChainRecentRoot = null;
        const heading = Array.from(document.querySelectorAll("div,span,h1,h2,h3,h4,h5,strong,b"))
            .find(node => node instanceof HTMLElement
                && !node.closest("#emu-war-caller-root,#chatRoot,#sidebarroot,#sidebar")
                && /^recent attacks$/i.test(compactText(node)));
        if (!(heading instanceof HTMLElement)) return null;
        const selector = "a[href*='profiles.php?XID='],a[href*='profiles.php'][href*='XID='],a[href*='/profiles/']";
        let current = heading.parentElement;
        for (let depth = 0; current && current !== document.body && depth < 8; depth += 1, current = current.parentElement) {
            const count = current.querySelectorAll(selector).length;
            if (count >= 2 && count <= 160) {
                state.factionChainRecentRoot = current;
                return current;
            }
        }
        return null;
    }

    function isFactionChainBspPage() {
        if (!/\/factions\.php$/i.test(String(location.pathname || ""))) return false;
        if (isFactionChainRoute()) return true;
        if (normalizedFactionHash()) return false;
        return Boolean(factionChainRecentAttacksRoot());
    }

    function isAdvancedSearchRoute() {
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "userlist";
        } catch (err) {
            return /(?:\?|&)sid=userlist(?:&|$)/i.test(String(location.href || ""));
        }
    }

    function isAdvancedSearchBspPage() {
        // Torn's Advanced Search has a stable sid=userlist route. Avoid scanning every
        // div/span on unrelated pages whenever Torn or chat mutates the DOM.
        return isAdvancedSearchRoute();
    }

    function isHallOfFameBspPage() {
        const path = String(location.pathname || "").toLowerCase();
        if (/\/halloffame\.php$/.test(path)) return true;
        if (!/\/(?:page|loader)\.php$/.test(path)) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "hof";
        } catch (err) {
            return /(?:\?|&)sid=hof(?:&|$)/i.test(location.href);
        }
    }

    function hallOfFameApiView() {
        if (!isHallOfFameBspPage()) return null;
        let category = "";
        let offset = NaN;
        try {
            const params = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
            category = String(params.get("type") || params.get("cat") || "").trim().toLowerCase();
            const rawPage = params.get("page");
            offset = rawPage === null ? NaN : Number(rawPage);
        } catch (err) { }
        if (!category) {
            const heading = compactText(hallOfFameRecordsHeader() || "").match(/ranked\s+by\s+(.+)$/i)?.[1] || "level";
            category = heading.toLowerCase().replace(/[^a-z0-9]+/g, "");
        }
        const aliases = {
            offense: "offences",
            offenses: "offences",
            offence: "offences",
            traveltime: "traveltime",
            workstat: "workstats",
            travel: "traveltime",
            work: "workstats"
        };
        category = aliases[category] || category;
        const supported = new Set(["level", "busts", "rank", "traveltime", "workstats", "networth", "revives", "defends", "offences", "attacks", "awards", "racingwins", "racingpoints", "racingskill"]);
        if (!supported.has(category)) return null;
        const firstRank = compactText(hallOfFameTableRows(1)[0] || "").match(/#([\d,]+)/)?.[1] || "";
        if (!firstRank) return null;
        // Torn's hash uses UI paging while the v2 endpoint expects a row offset.
        // The first visible rank is the reliable cross-browser source of truth.
        offset = Math.max(0, Number(firstRank.replace(/,/g, "")) - 1);
        offset = Math.max(0, Math.floor(offset));
        return { category, offset, key: `${category}:${offset}` };
    }

    async function primeHallOfFameCurrentPage() {
        const view = hallOfFameApiView();
        if (!view || !getApiKey() || state.hallOfFamePrimePending) return;
        if (state.hallOfFamePrimeRouteKey === view.key && state.hallOfFamePrimeRecords.length) return;
        state.hallOfFamePrimePending = true;
        try {
            const result = await apiRequest(`/api/torn/hof?cat=${encodeURIComponent(view.category)}&offset=${view.offset}&limit=100`, null, "GET");
            const currentView = hallOfFameApiView();
            if (!currentView || currentView.key !== view.key) return;
            const records = hallOfFamePayloadRecords(result?.payload || result);
            if (!records.length) return;
            state.hallOfFamePrimeRouteKey = view.key;
            state.hallOfFamePrimeRecords = records;
            state.hallOfFameTransientRecords = records;
            state.hallOfFameRecordSource = `Torn Hall of Fame API ${view.category} offset ${view.offset}`;
            // Rebind the visible rows to the authoritative rank-ordered roster before
            // waiting for prediction lookups. Torn's first React render can expose
            // stale player identities; paging happens to rebuild them, which is why
            // the old path only populated after moving away and back.
            scanSoon(0);
            await refreshEmuBspStats(records.map(record => ({ id: record.id, row: null })), false);
            scanSoon(0);
        } catch (err) {
            // The existing Torn page-response and React fallbacks remain available.
        } finally {
            state.hallOfFamePrimePending = false;
        }
    }

    function isCompanyBspPage() {
        const path = String(location.pathname || "").toLowerCase();
        if (/\/joblist\.php$/.test(path)) return true;
        if (!/\/(?:page|loader)\.php$/.test(path)) return false;
        let sid = "";
        try { sid = String(new URL(location.href).searchParams.get("sid") || "").toLowerCase(); } catch (err) { }
        if (sid && !/job|company/.test(sid) && !/\bjob listing\b/i.test(String(document.title || ""))) return false;
        return Array.from(document.querySelectorAll("div,span,h1,h2,h3,h4,h5,header,li,strong,b")).some(node => {
            const text = compactText(node);
            return text.length <= 80 && /\bcompany employees\b/i.test(text);
        });
    }

    function enhanceCompanyBspTable() {
        const members = [];
        const seenRows = new Set();
        const usePdaCards = isTornPdaRuntime();
        if (usePdaCards) {
            document.querySelectorAll('[data-emu-caller-company-bsp-header="true"]').forEach(header => {
                header.querySelector(":scope > .emu-caller-faction-bsp-header")?.remove();
                header.removeAttribute("data-emu-caller-company-bsp-header");
                header.removeAttribute("data-emu-caller-faction-bsp-header");
            });
        }
        document.querySelectorAll(".user.name").forEach(identityNode => {
            if (!(identityNode instanceof HTMLElement) || identityNode.closest("#emu-war-caller-root")) return;
            const playerId = companyPlayerId(identityNode, identityNode);
            if (!playerId || seenRows.has(identityNode)) return;
            const structuredRow = companyEmployeeRow(identityNode);
            const level = structuredRow instanceof HTMLElement ? companyLevelCell(structuredRow) : null;
            if (usePdaCards && structuredRow instanceof HTMLElement) {
                if (seenRows.has(structuredRow)) return;
                seenRows.add(structuredRow);
                structuredRow.querySelector(":scope > .emu-caller-faction-bsp-cell")?.remove();
                structuredRow.removeAttribute("data-emu-caller-faction-bsp-row");
                structuredRow.removeAttribute("data-emu-caller-company-bsp-row");
                structuredRow.dataset.emuCallerCompanyCardRow = String(playerId);
                structuredRow.dataset.emuCallerCompanyPdaRow = "true";
                ensureCompanyCardBsp(structuredRow, playerId, identityNode);
                members.push({ id: playerId, row: structuredRow });
                return;
            }
            if (structuredRow instanceof HTMLElement && level instanceof HTMLElement) {
                if (seenRows.has(structuredRow)) return;
                seenRows.add(structuredRow);
                structuredRow.dataset.emuCallerFactionBspRow = String(playerId);
                structuredRow.dataset.emuCallerCompanyBspRow = "true";
                ensureCompanyBspHeader(structuredRow);
                ensureCompanyBspCell(structuredRow, playerId, level);
                members.push({ id: playerId, row: structuredRow });
                return;
            }
            seenRows.add(identityNode);
            identityNode.dataset.emuCallerCompanyCardRow = String(playerId);
            identityNode.dataset.emuCallerCompanyNameCell = "true";
            ensureCompanyCardBsp(identityNode, playerId, identityNode);
            members.push({ id: playerId, row: identityNode });
        });
        const scope = companyEmployeeScope();
        const identitySelector = [
            ".user.name",
            "a[href*='profiles.php']", "a[href*='XID=']", "a[href*='userID=']", "a[href*='user2ID=']",
            "a[onclick*='profiles.php']", "a[onclick*='XID']", "a[onclick*='userID']",
            "[data-userid]", "[data-user-id]", "[data-user]", "[data-playerid]", "[data-player-id]",
            "[data-player]", "[data-xid]", "[data-id]", "[aria-label]", "[title]", "[alt]",
            "[data-tooltip]", "[data-title]", "[data-tip]", "[data-content]", "[class*='honor']", "[class*='name']"
        ].join(",");
        scope.querySelectorAll(identitySelector).forEach(identityNode => {
            if (!(identityNode instanceof HTMLElement) || identityNode.closest("#emu-war-caller-root,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar']")) return;
            const row = companyEmployeeRow(identityNode);
            const card = row instanceof HTMLElement ? null : companyEmployeeCard(identityNode, scope);
            const host = row || card;
            if (!(host instanceof HTMLElement)) return;
            if (seenRows.has(host)) return;
            const playerId = companyPlayerId(identityNode, host);
            if (!playerId) return;
            if (usePdaCards && row instanceof HTMLElement) {
                if (seenRows.has(row)) return;
                seenRows.add(row);
                row.querySelector(":scope > .emu-caller-faction-bsp-cell")?.remove();
                row.removeAttribute("data-emu-caller-faction-bsp-row");
                row.removeAttribute("data-emu-caller-company-bsp-row");
                row.dataset.emuCallerCompanyCardRow = String(playerId);
                row.dataset.emuCallerCompanyPdaRow = "true";
                ensureCompanyCardBsp(row, playerId, identityNode);
                members.push({ id: playerId, row });
                return;
            }
            if (row instanceof HTMLElement) {
                if (seenRows.has(row)) return;
                const level = companyLevelCell(row);
                if (!(level instanceof HTMLElement)) return;
                seenRows.add(row);
                row.dataset.emuCallerFactionBspRow = String(playerId);
                row.dataset.emuCallerCompanyBspRow = "true";
                ensureCompanyBspHeader(row);
                ensureCompanyBspCell(row, playerId, level);
                members.push({ id: playerId, row });
                return;
            }
            if (!(card instanceof HTMLElement)) return;
            seenRows.add(card);
            card.dataset.emuCallerCompanyCardRow = String(playerId);
            ensureCompanyCardBsp(card, playerId, identityNode);
            members.push({ id: playerId, row: card });
        });
        return members.slice(0, 100);
    }

    function companyEmployeeScope() {
        const heading = Array.from(document.querySelectorAll("div,span,h1,h2,h3,h4,h5,header,li,strong,b")).find(node => {
            const text = compactText(node);
            return text.length <= 80 && /\bcompany employees\b/i.test(text);
        });
        if (!(heading instanceof HTMLElement)) return document;
        let current = heading.parentElement;
        for (let depth = 0; current && current !== document.body && depth < 8; depth += 1, current = current.parentElement) {
            const text = compactText(current);
            const positions = (text.match(/\bposition\s*:/gi) || []).length;
            const identities = current.querySelectorAll("a[href*='profiles.php'],a[href*='XID='],[class*='honor'],[class*='name']").length;
            if (positions >= 2 && identities >= 2) return current;
        }
        return document;
    }

    function companyPlayerId(identityNode, host) {
        const values = [
            identityNode?.innerHTML,
            identityNode?.getAttribute?.("title"),
            identityNode?.textContent,
            host !== identityNode ? host?.getAttribute?.("title") : ""
        ];
        for (const value of values) {
            const bracketed = String(value || "").match(/\[(\d{3,12})\]/);
            if (bracketed) return Number(bracketed[1]);
        }
        return expandedBspPlayerId(identityNode, host);
    }

    function companyEmployeeRow(profile) {
        let current = profile?.parentElement;
        for (let depth = 0; current && current !== document.body && depth < 12; depth += 1, current = current.parentElement) {
            if (!(current instanceof HTMLElement)) continue;
            if (current.querySelectorAll("a[href*='profiles.php'],a[href*='XID=']").length > 4) continue;
            const children = Array.from(current.children || []).filter(node => node instanceof HTMLElement);
            if (children.length < 3 || children.length > 10) continue;
            const identityColumn = children.find(node => node === profile || node.contains(profile));
            if (!(identityColumn instanceof HTMLElement)) continue;
            const level = companyLevelCell(current);
            if (!(level instanceof HTMLElement) || level === identityColumn || identityColumn.contains(level)) continue;
            return current;
        }
        return null;
    }

    function companyEmployeeCard(profile, scope = document) {
        if (profile.matches?.(".user.name") && (scope === document || scope.contains(profile))) return profile;
        const selectors = [
            "li", "tr", "[class*='user']", "[class*='employee']", "[class*='company']",
            "[class*='member']", "[class*='list-item']", "[class*='item']", "[class*='table-row']", "[class*='row']"
        ];
        for (const selector of selectors) {
            const card = profile.closest(selector);
            if (!(card instanceof HTMLElement)) continue;
            if (scope !== document && !scope.contains(card)) continue;
            if (card.closest("#emu-war-caller-root,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar']")) continue;
            if (card.querySelectorAll("a[href*='profiles.php'],a[href*='XID=']").length > 8) continue;
            const rect = card.getBoundingClientRect();
            if (rect.width && rect.width < 180) continue;
            if (rect.height && rect.height > 150) continue;
            return card;
        }
        const scopeRect = scope instanceof HTMLElement ? scope.getBoundingClientRect() : null;
        const minimumWidth = Math.min(320, Math.max(180, Number(scopeRect?.width || window.innerWidth) * 0.55));
        let current = profile.parentElement;
        for (let depth = 0; current && current !== document.body && current !== scope && depth < 10; depth += 1, current = current.parentElement) {
            if (!(current instanceof HTMLElement)) continue;
            if (current.closest("#emu-war-caller-root,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar']")) return null;
            const rect = current.getBoundingClientRect();
            if (rect.width >= minimumWidth && rect.height >= 24 && rect.height <= 110) return current;
        }
        return null;
    }

    function companyLevelCell(row) {
        const named = standardFactionCell(row, "level");
        if (named) return named;
        return Array.from(row?.children || []).find(node => {
            if (!(node instanceof HTMLElement) || node.querySelector("a[href*='profiles.php'],a[href*='XID=']")) return false;
            return /^(?:100|[1-9]?\d)$/.test(compactText(node.textContent || ""));
        }) || null;
    }

    function companyHeaderForRow(row) {
        let scope = row.parentElement;
        for (let depth = 0; scope && scope !== document.body && depth < 5; depth += 1, scope = scope.parentElement) {
            const candidates = Array.from(scope.querySelectorAll(":scope > *, :scope > * > *")).filter(node => node instanceof HTMLElement);
            const header = candidates.find(node => {
                if (node === row || node.dataset.emuCallerCompanyBspRow === "true") return false;
                if (node.querySelector("a[href*='profiles.php'],a[href*='XID=']")) return false;
                const labels = Array.from(node.children || []).map(child => compactText(child.textContent || "").toLowerCase());
                return labels.some(label => label === "level" || label === "lvl") && labels.some(label => label === "status");
            });
            if (header) return header;
        }
        return null;
    }

    function ensureCompanyBspHeader(row) {
        const header = companyHeaderForRow(row);
        if (!(header instanceof HTMLElement)) return null;
        header.dataset.emuCallerFactionBspHeader = "true";
        header.dataset.emuCallerCompanyBspHeader = "true";
        let cell = header.querySelector(":scope > .emu-caller-faction-bsp-header");
        if (cell) return cell;
        const level = standardFactionCell(header, "level") || Array.from(header.children || []).find(node => /^level$/i.test(compactText(node.textContent || "")));
        if (!(level instanceof HTMLElement)) return null;
        cell = document.createElement(["LI", "TD", "TH"].includes(level.tagName) ? level.tagName.toLowerCase() : "div");
        cell.className = "emu-caller-faction-bsp-header";
        cell.textContent = "BSP";
        level.after(cell);
        return cell;
    }

    function ensureCompanyBspCell(row, playerId, level) {
        let cell = row.querySelector(":scope > .emu-caller-faction-bsp-cell");
        if (!cell) {
            cell = document.createElement(["LI", "TD", "TH"].includes(level?.tagName) ? level.tagName.toLowerCase() : "div");
            cell.className = "emu-caller-faction-bsp-cell";
            cell.innerHTML = '<span class="emu-caller-faction-bsp-value">--</span>';
            level.after(cell);
        }
        ensureStandardFactionBspCell(row, playerId);
        return cell;
    }

    function ensureCompanyCardBsp(card, playerId, identityNode = null) {
        let badge = card.querySelector(":scope > .emu-caller-company-card-bsp");
        if (!badge) {
            badge = document.createElement("div");
            badge.className = "emu-caller-company-card-bsp";
            badge.innerHTML = '<div class="emu-caller-company-card-bsp-inner"><span class="emu-caller-faction-bsp-value">--</span></div>';
            card.appendChild(badge);
        }
        const identityHost = identityNode instanceof HTMLElement && card.contains(identityNode)
            ? identityNode.closest(".user.name,.honor-text-wrap,a[href*='profiles.php'],a[href*='XID=']") || identityNode
            : null;
        const valueNode = badge.querySelector(".emu-caller-faction-bsp-value");
        const cached = state.bspPredictions.get(Number(playerId)) || {};
        const estimate = bspValueForId(playerId, card) || "--";
        const total = bspTotalValue(cached, estimate);
        const tier = estimate === "--" ? "pending" : callerBspTier(total, cached);
        if (valueNode && valueNode.textContent !== estimate) valueNode.textContent = estimate;
        if (valueNode) valueNode.dataset.tier = tier;
        badge.dataset.playerId = String(playerId);
        badge.title = `EmuControl BSP estimate: ${estimate} | Player ${playerId}`;
        if (card.dataset.emuCallerCompanyPdaRow !== "true") {
            scheduleBspNameCollisionRepair(card, badge, identityHost || card, "company");
        }
        return badge;
    }

    function bspIdentityTextRect(root, badge) {
        if (!(root instanceof HTMLElement) || typeof document.createTreeWalker !== "function") return null;
        const walker = document.createTreeWalker(root, window.NodeFilter?.SHOW_TEXT || 4);
        const candidates = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!/[a-z]/i.test(String(node.nodeValue || "").trim()) || badge?.contains(node.parentElement)) continue;
            try {
                const range = document.createRange();
                range.selectNodeContents(node);
                const rect = range.getBoundingClientRect();
                if (rect.width > 3 && rect.height > 3) candidates.push(rect);
            } catch (err) { }
        }
        return candidates.sort((left, right) => right.width - left.width)[0] || null;
    }

    function bspRectsOverlap(left, right) {
        return Boolean(left && right && left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top);
    }

    function scheduleBspNameCollisionRepair(host, badge, identityRoot, kind) {
        if (!(host instanceof HTMLElement) || !(badge instanceof HTMLElement)) return;
        const safeAttribute = kind === "hall-of-fame"
            ? "data-emu-caller-hof-collision-safe"
            : "data-emu-caller-company-collision-safe";
        if (host.getAttribute(safeAttribute) === "true") return;
        const checkingAttribute = kind === "hall-of-fame"
            ? "data-emu-caller-hof-collision-checking"
            : "data-emu-caller-company-collision-checking";
        if (host.getAttribute(checkingAttribute) === "true") return;
        host.setAttribute(checkingAttribute, "true");
        // Desktop-mode phone browsers can spoof both the user agent and viewport.
        // Recheck company rows after their honor/name layout settles instead of
        // relying on a mobile media query that those browsers never trigger.
        const delays = kind === "company" ? [0, 250, 900] : [0];
        const check = (last = false) => window.requestAnimationFrame(() => {
            if (!host.isConnected || !badge.isConnected) {
                host.removeAttribute(checkingAttribute);
                return;
            }
            const textRect = bspIdentityTextRect(identityRoot instanceof HTMLElement ? identityRoot : host, badge);
            const badgeRect = badge.getBoundingClientRect();
            if (bspRectsOverlap(textRect, badgeRect)) {
                host.setAttribute(safeAttribute, "true");
                host.removeAttribute(checkingAttribute);
                if (kind !== "company") return;
                const identityHost = identityRoot instanceof HTMLElement && host.contains(identityRoot) ? identityRoot : null;
                if (identityHost instanceof HTMLElement && identityHost !== host && identityHost.parentElement === host) {
                    identityHost.insertAdjacentElement("afterend", badge);
                } else {
                    host.appendChild(badge);
                }
                return;
            }
            if (last) host.removeAttribute(checkingAttribute);
        });
        delays.forEach((delay, index) => window.setTimeout(() => check(index === delays.length - 1), delay));
    }

    const hallOfFamePortalHosts = new Map();
    const hallOfFameReactHosts = new Map();

    function hallOfFameInlineAnchor(mount) {
        if (!(mount instanceof HTMLElement)) return null;
        const row = mount.matches("tr,[role='row']") ? mount : mount.closest("tr,[role='row']");
        if (!(row instanceof HTMLElement)) return mount;
        const cells = Array.from(row.children || []).filter(cell => cell instanceof HTMLElement);
        if (!cells.length) return row;
        return cells.map(cell => {
            const text = compactText(cell);
            const visuals = cell.querySelectorAll("img,picture,canvas,svg,[class*='honor'],[class*='name']").length;
            const numericOnly = /^#?[\d,]+$/.test(text);
            return { cell, score: visuals * 20 + Math.min(text.length, 60) - (numericOnly ? 40 : 0) };
        }).sort((left, right) => right.score - left.score)[0]?.cell || row;
    }

    function hallOfFameInlineLeft(anchor) {
        if (!(anchor instanceof HTMLElement)) return 4;
        const anchorRect = anchor.getBoundingClientRect();
        const visualNodes = Array.from(anchor.querySelectorAll("img,picture,canvas,svg,[class*='honor']"))
            .filter(node => !node.closest(".emu-caller-hof-bsp-injection"))
            .map(node => ({ node, rect: node.getBoundingClientRect() }));
        const visuals = visualNodes
            .filter(item => item.rect.width >= 70 && item.rect.width <= Math.min(280, anchorRect.width * 0.82) && item.rect.height >= 10 && item.rect.height <= 44)
            .sort((left, right) => right.rect.width - left.rect.width || left.rect.left - right.rect.left);
        const visual = visuals[0]?.rect;
        const factionIcon = visual ? visualNodes
            .filter(item => item.rect.width >= 18 && item.rect.width <= 58 && item.rect.height >= 16 && item.rect.height <= 44 && item.rect.right <= visual.left + 4)
            .sort((left, right) => right.rect.right - left.rect.right)[0]?.rect : null;
        const desired = factionIcon ? factionIcon.right - anchorRect.left + 2 : visual ? visual.left - anchorRect.left - 8 : 50;
        return Math.max(4, Math.min(desired, Math.max(4, anchorRect.width - 48)));
    }

    function enhanceHallOfFameBspTable() {
        document.querySelectorAll("body > .emu-caller-hof-bsp-injection").forEach(injection => injection.remove());
        hallOfFamePortalHosts.forEach((host, injection) => {
            if (!injection.isConnected || !(host instanceof HTMLElement) || !host.isConnected) hallOfFamePortalHosts.delete(injection);
        });
        document.querySelectorAll("[data-emu-caller-hall-of-fame-bsp-host]").forEach(host => host.removeAttribute("data-emu-caller-hall-of-fame-bsp-host"));
        const members = [];
        const seenHosts = new Set();
        const authoritativeRecords = hallOfFameAuthoritativeRecords();
        if (authoritativeRecords.length) {
            const expectedIds = new Set();
            hallOfFameRecordHosts(authoritativeRecords, true).forEach(({ record, host }) => {
                if (!(host instanceof HTMLElement) || !record?.id || seenHosts.has(host)) return;
                const playerId = Number(record.id);
                if (!playerId) return;
                seenHosts.add(host);
                expectedIds.add(playerId);
                ensureHallOfFameBspBadge(host, host, playerId);
                members.push({ id: playerId, row: host });
            });
            document.querySelectorAll(".emu-caller-hof-bsp-injection[data-player-id]").forEach(injection => {
                if (!expectedIds.has(Number(injection.dataset.playerId || 0))) {
                    hallOfFamePortalHosts.delete(injection);
                    injection.remove();
                }
            });
            if (members.length >= Math.min(authoritativeRecords.length, 3)) return members.slice(0, 100);
        }
        const attachIdentity = (identity, hiddenIdentity = false) => {
            if (!(identity instanceof HTMLElement)) return;
            if (identity.closest("#emu-war-caller-root,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar']")) return;
            const mount = hiddenIdentity ? identity : hallOfFameBspMount(identity);
            if (!(mount instanceof HTMLElement) || seenHosts.has(mount)) return;
            const playerId = expandedBspPlayerId(identity, mount) || hallOfFamePlayerId(identity);
            if (!playerId) return;
            seenHosts.add(mount);
            ensureHallOfFameBspBadge(mount, identity, playerId);
            members.push({ id: playerId, row: mount });
        };
        document.querySelectorAll(".user.name").forEach(identity => attachIdentity(identity, true));
        const identities = document.querySelectorAll([
            ".honor-text-wrap", "[class*='userInfoBox__']",
            "a[href*='profiles.php']", "a[href*='XID=']", "a[href*='userId=']",
            "a[onclick*='profiles.php']", "[data-userid]", "[data-user-id]", "[data-playerid]", "[data-player-id]"
        ].join(","));
        identities.forEach(identity => attachIdentity(identity, false));
        if (!hasCompleteHallOfFameBspCoverage()) {
            const records = hallOfFameDataRecords();
            hallOfFameRecordHosts(records).forEach(({ record, host }) => {
                if (!(host instanceof HTMLElement) || !record?.id || seenHosts.has(host)) return;
                seenHosts.add(host);
                ensureHallOfFameBspBadge(host, host, record.id);
                members.push({ id: Number(record.id), row: host });
            });
        }
        return members.slice(0, 100);
    }

    function hallOfFameBspMount(identity) {
        if (!(identity instanceof HTMLElement)) return null;
        const nativeIdentity = identity.closest(".user.name,.honor-text-wrap,[class*='userInfoBox__']");
        if (nativeIdentity instanceof HTMLElement) return nativeIdentity;
        const profile = identity.matches("a[href],a[onclick]") ? identity : identity.closest("a[href],a[onclick]");
        return profile instanceof HTMLElement ? profile : null;
    }

    function hallOfFamePlayerId(element) {
        if (!(element instanceof HTMLElement)) return 0;
        const anchors = [];
        if (element.parentElement instanceof HTMLAnchorElement) anchors.push(element.parentElement);
        anchors.push(...element.querySelectorAll("a[href]"));
        if (element instanceof HTMLAnchorElement) anchors.push(element);
        const closest = element.closest("a[href]");
        if (closest instanceof HTMLAnchorElement) anchors.push(closest);
        for (const anchor of anchors) {
            const href = String(anchor.href || anchor.getAttribute("href") || "");
            const match = href.match(/[?&](?:XID|userId|userID|user2ID)=(\d{3,12})/i);
            if (match) return Number(match[1]);
        }
        return 0;
    }

    function ensureHallOfFameBspBadge(mount, profile, playerId) {
        if (!(mount instanceof HTMLElement)) return null;
        const numericId = Number(playerId);
        if (!numericId) return null;
        const row = mount.matches("tr,[role='row']") ? mount : mount.closest("tr,[role='row']") || mount;
        const anchor = hallOfFameInlineAnchor(row);
        if (!(anchor instanceof HTMLElement)) return null;
        Array.from(anchor.children || []).filter(node => node instanceof HTMLElement && node.matches(".emu-caller-hof-bsp-injection") && Number(node.dataset.playerId || 0) !== numericId).forEach(node => {
            hallOfFamePortalHosts.delete(node);
            node.remove();
        });
        let injection = document.querySelector(`.emu-caller-hof-bsp-injection[data-player-id="${numericId}"]`);
        if (!injection) {
            injection = document.createElement("span");
            injection.className = "emu-caller-hof-bsp-injection";
            injection.innerHTML = '<span class="emu-caller-hof-bsp-inner"><span class="emu-caller-hof-bsp-badge emu-caller-faction-bsp-value">--</span></span>';
        }
        if (injection.parentElement !== anchor) anchor.appendChild(injection);
        injection.dataset.playerId = String(numericId);
        injection.hidden = false;
        injection.style.setProperty("--emu-caller-hof-inline-left", `${hallOfFameInlineLeft(anchor)}px`);
        anchor.dataset.emuCallerHofBspAnchor = "true";
        row.dataset.emuCallerHallOfFameBspHost = String(numericId);
        hallOfFamePortalHosts.set(injection, row);
        const badge = injection.querySelector(".emu-caller-hof-bsp-badge");
        if (!(badge instanceof HTMLElement)) return null;
        const cached = state.bspPredictions.get(Number(playerId)) || {};
        const estimate = bspValueForId(playerId, mount) || "--";
        const total = bspTotalValue(cached, estimate);
        badge.textContent = compactHallOfFameBspValue(estimate);
        badge.dataset.tier = estimate === "--" ? "pending" : callerBspTier(total, cached);
        badge.dataset.playerId = String(numericId);
        badge.title = `EmuControl BSP estimate: ${estimate} | Player ${playerId}`;
        scheduleBspNameCollisionRepair(anchor, injection, anchor, "hall-of-fame");
        return badge;
    }

    function compactHallOfFameBspValue(value) {
        const text = compactText(value).toLowerCase();
        const match = text.match(/^(\d+(?:\.\d+)?)([kmbtq])$/);
        if (!match) return text || "--";
        const amount = Number(match[1]);
        if (!Number.isFinite(amount)) return text;
        const truncatedTenths = Math.floor(amount * 10) / 10;
        const compactAmount = amount < 10 && truncatedTenths % 1 ? truncatedTenths.toFixed(1) : String(Math.floor(amount));
        return `${compactAmount}${match[2]}`;
    }

    function hallOfFameTableRows(limit = 250) {
        const header = hallOfFameRecordsHeader();
        if (!(header instanceof HTMLElement)) return [];
        const headerRect = header.getBoundingClientRect();
        const seenRanks = new Set();
        return Array.from(document.querySelectorAll("tr[class*='tableRow'],tbody tr,tr[role='row']"))
            .filter(row => {
                if (!(row instanceof HTMLElement) || row.closest("#emu-war-caller-root,#emu-caller-hof-diagnostic,[id*='chat'],[class*='chat']")) return false;
                const rect = row.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0 || rect.top < headerRect.bottom - 4 || rect.top > headerRect.bottom + 3000) return false;
                const rank = compactText(row).match(/#\d{1,9}/)?.[0] || "";
                if (!rank || seenRanks.has(rank)) return false;
                seenRanks.add(rank);
                return true;
            })
            .sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top)
            .slice(0, limit);
    }

    function hallOfFameReactRecordForRow(row) {
        if (!(row instanceof HTMLElement)) return null;
        const rowSignature = hallOfFameRowSignature(row);
        const cachedId = Number(row.dataset.emuCallerHofReactPlayerId || 0);
        if (cachedId && row.dataset.emuCallerHofReactSignature === rowSignature) return { id: cachedId, name: row.dataset.emuCallerHofReactPlayerName || "" };
        delete row.dataset.emuCallerHofReactPlayerId;
        delete row.dataset.emuCallerHofReactPlayerName;
        delete row.dataset.emuCallerHofReactSignature;
        const roots = [];
        [row, ...Array.from(row.querySelectorAll("*")).slice(0, 80)].forEach(node => {
            Object.keys(node).filter(key => /^__reactProps\$|^__reactFiber\$/.test(key)).forEach(key => {
                const value = node[key];
                if (/^__reactFiber\$/.test(key)) {
                    if (value?.memoizedProps) roots.push(value.memoizedProps);
                    if (value?.pendingProps && value.pendingProps !== value.memoizedProps) roots.push(value.pendingProps);
                } else if (value) roots.push(value);
            });
        });
        const candidates = new Map();
        const visited = new WeakSet();
        let visitedCount = 0;
        let matched = null;
        const rowText = compactText(row).toLowerCase();
        const walk = (value, depth = 0, fallbackKey = "") => {
            if (matched || !value || typeof value !== "object" || value instanceof Node || depth > 7 || visitedCount > 800 || visited.has(value)) return;
            visited.add(value);
            visitedCount += 1;
            const record = advancedSearchRecordFromObject(value, fallbackKey);
            if (record && !candidates.has(record.id)) {
                candidates.set(record.id, record);
                if (record.name && rowText.includes(record.name.toLowerCase())) matched = record;
            }
            const entries = Array.isArray(value) ? value.slice(0, 120).map((item, index) => [String(index), item]) : Object.entries(value).slice(0, 120);
            entries.forEach(([key, item]) => walk(item, depth + 1, key));
        };
        roots.slice(0, 60).forEach(root => walk(root));
        const result = matched || Array.from(candidates.values()).sort((left, right) => {
            const leftMatch = left.name && rowText.includes(left.name.toLowerCase()) ? 1 : 0;
            const rightMatch = right.name && rowText.includes(right.name.toLowerCase()) ? 1 : 0;
            return rightMatch - leftMatch || Number(Boolean(right.name)) - Number(Boolean(left.name));
        })[0] || null;
        if (result?.id) {
            row.dataset.emuCallerHofReactPlayerId = String(result.id);
            row.dataset.emuCallerHofReactPlayerName = result.name || "";
            row.dataset.emuCallerHofReactSignature = rowSignature;
        }
        return result;
    }

    function hallOfFameRowSignature(row) {
        if (!(row instanceof HTMLElement)) return "";
        const textClone = row.cloneNode(true);
        textClone.querySelectorAll?.(".emu-caller-hof-bsp-injection").forEach(node => node.remove());
        const visuals = Array.from(row.querySelectorAll("img,picture,source,[style*='background']")).slice(0, 12).map(node =>
            node.getAttribute("src") || node.getAttribute("srcset") || node.getAttribute("alt") || node.style?.backgroundImage || ""
        ).filter(Boolean).join("|");
        return `${compactText(textClone).slice(0, 160)}|${visuals.slice(0, 1200)}`;
    }

    function hallOfFameReactRecords() {
        const records = [];
        const seen = new Set();
        hallOfFameReactHosts.clear();
        hallOfFameTableRows().forEach(row => {
            const record = hallOfFameReactRecordForRow(row);
            if (!record?.id || seen.has(record.id)) return;
            seen.add(record.id);
            records.push(record);
            hallOfFameReactHosts.set(Number(record.id), row);
        });
        return records;
    }

    function hallOfFameDataRecords() {
        let best = [];
        let source = "";
        const authoritativeRecords = hallOfFameAuthoritativeRecords();
        if (authoritativeRecords.length) {
            state.hallOfFameRecordSource = `Torn Hall of Fame API ${state.hallOfFamePrimeRouteKey}`;
            return authoritativeRecords.slice(0, 250);
        }
        const reactRecords = hallOfFameReactRecords();
        if (reactRecords.length >= 3) {
            state.hallOfFameRecordSource = "Torn Hall of Fame React rows";
            return reactRecords.slice(0, 250);
        }
        const responses = Array.isArray(state.pageData.hallOfFame) ? state.pageData.hallOfFame : [];
        responses.forEach(entry => {
            const records = Array.isArray(entry?.records) ? entry.records : hallOfFamePayloadRecords(entry?.payload);
            if (records.length >= best.length) {
                best = records;
                source = compactText(entry?.url || "captured Hall of Fame JSON").slice(0, 160);
            }
        });
        if (!best.length) {
            best = Array.isArray(state.hallOfFameTransientRecords) ? state.hallOfFameTransientRecords : [];
            if (best.length) source = "Transient Torn identity nodes";
        }
        state.hallOfFameRecordSource = source || state.hallOfFameRecordSource || "";
        return best.slice(0, 250);
    }

    function hallOfFameAuthoritativeRecords() {
        const view = hallOfFameApiView();
        if (!view || state.hallOfFamePrimeRouteKey !== view.key) return [];
        const records = Array.isArray(state.hallOfFamePrimeRecords) ? state.hallOfFamePrimeRecords : [];
        return records.filter(record => Number(record?.id) > 0).slice(0, 250);
    }

    function hallOfFamePayloadRecords(payload) {
        const groups = [];
        const directHofRows = Array.isArray(payload?.hof)
            ? payload.hof
            : Array.isArray(payload?.payload?.hof)
                ? payload.payload.hof
                : [];
        const directHofRecords = directHofRows.map(row => ({
            id: Number(row?.id || row?.user_id || row?.player_id || 0),
            name: compactText(row?.username || row?.name || "").slice(0, 80)
        })).filter(record => record.id > 0);
        if (directHofRecords.length) groups.push(directHofRecords);
        const objectRecords = advancedSearchPayloadRecords(payload);
        if (objectRecords.length) groups.push(objectRecords);
        const visited = new WeakSet();
        let visitedCount = 0;
        const parseHtml = value => {
            const html = String(value || "");
            if (html.length < 20 || !/profiles\.php|(?:XID|userId|userID)[=%]/i.test(html)) return [];
            const records = [];
            const ids = new Set();
            try {
                const parsed = new DOMParser().parseFromString(html, "text/html");
                parsed.querySelectorAll("a[href*='profiles.php'],a[href*='XID='],a[href*='userId='],[data-userid],[data-user-id],[data-playerid],[data-player-id]").forEach(node => {
                    const playerId = expandedBspPlayerId(node, node);
                    if (!playerId || ids.has(playerId)) return;
                    ids.add(playerId);
                    records.push({ id: Number(playerId), name: compactText(node).replace(/\[\d{3,12}\]/g, "").trim().slice(0, 80) });
                });
            } catch (err) { }
            const pattern = /(?:profiles\.php[^"'<>]{0,240}?(?:XID|userId|userID|user2ID)[=%](?:3D)?|data-(?:user|player)(?:-?id)?[\s=:"']+)(\d{3,12})/gi;
            for (const match of html.matchAll(pattern)) {
                const playerId = Number(match[1]);
                if (!playerId || ids.has(playerId)) continue;
                ids.add(playerId);
                records.push({ id: playerId, name: "" });
            }
            return records;
        };
        const walk = (value, depth = 0) => {
            if (depth > 9 || visitedCount > 8000 || value == null) return;
            if (typeof value === "string") {
                const records = parseHtml(value);
                if (records.length >= 2) groups.push(records);
                return;
            }
            if (typeof value !== "object" || visited.has(value)) return;
            visited.add(value);
            visitedCount += 1;
            if (Array.isArray(value)) value.slice(0, 500).forEach(item => walk(item, depth + 1));
            else Object.values(value).forEach(item => walk(item, depth + 1));
        };
        walk(payload);
        groups.sort((left, right) => right.length - left.length);
        return (groups[0] || []).slice(0, 250);
    }

    function hallOfFameGenericRowForNode(node, header) {
        if (!(node instanceof HTMLElement) || !(header instanceof HTMLElement)) return null;
        const headerRect = header.getBoundingClientRect();
        for (let current = node, depth = 0; current && current !== document.body && depth < 9; current = current.parentElement, depth += 1) {
            if (!(current instanceof HTMLElement)) continue;
            const rect = current.getBoundingClientRect();
            if (rect.top < headerRect.bottom - 4 || rect.width < Math.max(170, headerRect.width * 0.68) || rect.height < 26 || rect.height > 100) continue;
            return current;
        }
        return null;
    }

    function hallOfFameGenericRows(limit = 100) {
        const header = hallOfFameRecordsHeader();
        if (!(header instanceof HTMLElement)) return [];
        const rankedRows = hallOfFameRankRows(limit, header);
        if (rankedRows.length >= 3) return rankedRows;
        const headerRect = header.getBoundingClientRect();
        let best = [];
        let bestScore = 0;
        const containers = Array.from(document.querySelectorAll("div,section,main,ul,ol,tbody")).slice(0, 3500);
        containers.forEach(container => {
            if (!(container instanceof HTMLElement) || container.closest("#emu-war-caller-root,#emu-caller-hof-diagnostic,[id*='chat'],[class*='chat']")) return;
            const children = Array.from(container.children || []).filter(child => {
                if (!(child instanceof HTMLElement) || child.closest("#emu-war-caller-root,#emu-caller-hof-diagnostic")) return false;
                const rect = child.getBoundingClientRect();
                if (rect.top < headerRect.bottom - 3 || rect.top > headerRect.bottom + 2400) return false;
                if (rect.width < Math.max(170, headerRect.width * 0.68) || rect.height < 26 || rect.height > 100) return false;
                return !/^(?:people\s+)?ranked\s+by\b/i.test(compactText(child));
            });
            if (children.length < 3 || children.length > 300) return;
            const distinctTops = new Set(children.map(child => Math.round(child.getBoundingClientRect().top / 3))).size;
            const score = distinctTops * 10 + children.length;
            if (distinctTops >= 3 && score > bestScore) {
                best = children;
                bestScore = score;
            }
        });
        return best.sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top).slice(0, limit);
    }

    function hallOfFameRankRows(limit = 100, header = hallOfFameRecordsHeader()) {
        return hallOfFameTableRows(limit);
    }

    function hallOfFameRecordHosts(records, preferRankOrder = false) {
        if (!records.length) return [];
        const header = hallOfFameRecordsHeader();
        if (preferRankOrder) {
            const rankedRows = hallOfFameRankRows(records.length, header);
            if (rankedRows.length >= Math.min(records.length, 3)) {
                return rankedRows.map((host, index) => ({ record: records[index], host })).filter(item => item.record?.id);
            }
            const genericRows = hallOfFameGenericRows(records.length);
            if (genericRows.length >= Math.min(records.length, 3)) {
                return genericRows.map((host, index) => ({ record: records[index], host })).filter(item => item.record?.id);
            }
        }
        const reactMatches = records.map(record => ({ record, host: hallOfFameReactHosts.get(Number(record.id)) })).filter(item => item.host instanceof HTMLElement);
        if (reactMatches.length >= Math.min(records.length, 3)) return reactMatches;
        const rankedRows = hallOfFameRankRows(records.length, header);
        if (rankedRows.length >= Math.min(records.length, 3)) {
            return rankedRows.map((host, index) => ({ record: records[index], host })).filter(item => item.record?.id);
        }
        const matched = [];
        const used = new Set();
        if (header instanceof HTMLElement) {
            const textNodes = Array.from(document.querySelectorAll("span,div,p,strong,b")).filter(node => {
                if (!(node instanceof HTMLElement) || node.children.length > 4 || node.closest("#emu-war-caller-root,#emu-caller-hof-diagnostic,[id*='chat'],[class*='chat']")) return false;
                const rect = node.getBoundingClientRect();
                const text = compactText(node);
                return rect.width > 0 && rect.height > 0 && text.length > 0 && text.length <= 80;
            }).slice(0, 5000);
            records.forEach(record => {
                if (!record.name) return;
                const needle = record.name.toLowerCase();
                const identity = textNodes.find(node => compactText(node).toLowerCase() === needle);
                const host = hallOfFameGenericRowForNode(identity, header);
                if (host && !used.has(host)) {
                    used.add(host);
                    matched.push({ record, host });
                }
            });
        }
        if (matched.length >= Math.min(records.length, 3)) return matched;
        const rows = hallOfFameGenericRows(records.length);
        return rows.map((host, index) => ({ record: records[index], host })).filter(item => item.record?.id);
    }

    function hasVisibleHallOfFameBspBadge() {
        return Array.from(document.querySelectorAll(".emu-caller-hof-bsp-badge")).some(badge => {
            const rect = badge.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
    }

    function hasCompleteHallOfFameBspCoverage() {
        const rows = hallOfFameRankRows(250);
        if (rows.length < 3) return hasVisibleHallOfFameBspBadge();
        const tagged = rows.filter(row => Array.from(hallOfFamePortalHosts.entries()).some(([badge, anchor]) => badge.isConnected && anchor === row)).length;
        return tagged >= Math.ceil(rows.length * 0.75);
    }

    function hallOfFameRecordsHeader() {
        return Array.from(document.querySelectorAll("div,span,p,h1,h2,h3,h4,h5,header,li,tr,strong"))
            .filter(node => node instanceof HTMLElement && !node.closest("#emu-war-caller-root,#emu-caller-hof-diagnostic,[id*='chat'],[class*='chat']"))
            .filter(node => compactText(node).length <= 80 && /^(?:people\s+)?ranked\s+by\s+.+$/i.test(compactText(node)))
            .sort((left, right) => left.children.length - right.children.length || left.getBoundingClientRect().top - right.getBoundingClientRect().top)[0] || null;
    }

    function renderHallOfFameDiagnostic(roster = []) {
        const header = hallOfFameRecordsHeader();
        if (!(header instanceof HTMLElement)) return;
        let panel = document.getElementById("emu-caller-hof-diagnostic");
        if (!panel) {
            panel = document.createElement("section");
            panel.id = "emu-caller-hof-diagnostic";
            panel.style.cssText = "box-sizing:border-box;width:min(430px,calc(100vw - 24px));max-height:55vh;margin:0;padding:9px 10px;overflow:auto;border:1px solid #62d98a;border-radius:3px;background:rgba(10,18,14,.96);color:#dfffea;font:12px/1.35 Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.45);position:fixed;top:170px;right:12px;z-index:2147483646;";
            const mount = header.closest("li,tr,[class*='header'],[class*='title']") || header;
            mount.insertAdjacentElement("afterend", panel);
        }
        const headerBottom = header.getBoundingClientRect().bottom;
        const inResultsArea = node => {
            if (!(node instanceof HTMLElement) || node.closest("#emu-war-caller-root,#emu-caller-hof-diagnostic,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar']")) return false;
            const rect = node.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.bottom >= headerBottom - 4 && rect.top <= headerBottom + 2400;
        };
        const profileLinks = Array.from(document.querySelectorAll("a[href*='profiles.php'],a[href*='XID='],a[href*='userID='],a[href*='user2ID=']")).filter(inResultsArea);
        const profileClicks = Array.from(document.querySelectorAll("a[onclick*='profiles.php'],a[onclick*='XID'],[onclick*='profiles.php'],[onclick*='XID']")).filter(inResultsArea);
        const idNodes = Array.from(document.querySelectorAll("[data-userid],[data-user-id],[data-user],[data-playerid],[data-player-id],[data-player],[data-xid]")).filter(inResultsArea);
        const honorNodes = Array.from(document.querySelectorAll("[class*='honorWrap'],[class*='honor-wrap'],[class*='honor-text'],[class*='honor']")).filter(inResultsArea);
        const honorImages = Array.from(document.querySelectorAll("img")).filter(node => {
            if (!inResultsArea(node)) return false;
            const rect = node.getBoundingClientRect();
            return rect.width >= 120 && rect.height <= 90;
        });
        const clickableNodes = Array.from(document.querySelectorAll("a,button,[role='button'],[onclick]")).filter(inResultsArea);
        const hiddenIdentityNodes = Array.from(document.querySelectorAll(".user.name")).filter(node =>
            node instanceof HTMLElement && !node.closest("#emu-war-caller-root,#emu-caller-hof-diagnostic,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar']")
        );
        const hiddenIdentityIds = hiddenIdentityNodes.map(node => expandedBspPlayerId(node, node)).filter(Boolean);
        const rowNodes = Array.from(document.querySelectorAll("li,tr,[class*='table-row'],[class*='list-row'],[class*='list-item'],[class*='user-row'],[class*='row'],[class*='user']")).filter(node => {
            if (!inResultsArea(node) || node.querySelector("textarea,input[type='text'],input[type='search']")) return false;
            const rect = node.getBoundingClientRect();
            return rect.width >= 180 && rect.height >= 24 && rect.height <= 140;
        });
        const capturedResponses = Array.isArray(state.pageData.hallOfFame) ? state.pageData.hallOfFame : [];
        const tableRows = hallOfFameTableRows();
        const reactRecords = hallOfFameReactRecords();
        const capturedRecords = hallOfFameDataRecords();
        const genericRows = hallOfFameGenericRows(capturedRecords.length || 100);
        const badges = Array.from(document.querySelectorAll(".emu-caller-hof-bsp-badge"));
        const visibleBadges = badges.filter(badge => {
            const rect = badge.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
        const hosts = Array.from(hallOfFamePortalHosts.values()).filter(host => host instanceof HTMLElement && host.isConnected);
        const sampleNode = genericRows[0] || rowNodes[0] || honorNodes[0] || honorImages[0] || profileLinks[0] || idNodes[0] || clickableNodes[0] || hiddenIdentityNodes[0] || null;
        const sample = advancedSearchDiagnosticSignature(sampleNode);
        const captureUrl = compactText(state.hallOfFameRecordSource || capturedResponses[capturedResponses.length - 1]?.url || "none").slice(0, 180);
        const details = [
            `EmuControl Companion Hall of Fame diagnostic v${RUNTIME_VERSION}`,
            `URL route: ${String(location.pathname || "")}${String(location.search || "")}${String(location.hash || "")}`,
            `Ranked header found: yes`,
            `Roster candidates returned: ${Array.isArray(roster) ? roster.length : 0}`,
            `Injected badge nodes: ${badges.length}`,
            `Visible badge nodes: ${visibleBadges.length}`,
            `Tagged host nodes: ${hosts.length}`,
            `Hidden .user.name nodes: ${hiddenIdentityNodes.length}`,
            `IDs parsed from hidden nodes: ${hiddenIdentityIds.length}`,
            `Profile hrefs: ${profileLinks.length}`,
            `Profile onclicks: ${profileClicks.length}`,
            `Player-ID data nodes: ${idNodes.length}`,
            `Honor wrappers: ${honorNodes.length}`,
            `Honor-sized images: ${honorImages.length}`,
            `Clickable nodes: ${clickableNodes.length}`,
            `Row candidates: ${rowNodes.length}`,
            `React table rows: ${tableRows.length}`,
            `React player records: ${reactRecords.length}`,
            `Captured JSON responses: ${capturedResponses.length}`,
            `Captured player records: ${capturedRecords.length}`,
            `Generic repeated rows: ${genericRows.length}`,
            `Record source: ${captureUrl || "none"}`,
            `Sample structure: ${sample || "none"}`
        ].join("\n");
        panel.dataset.diagnostic = details;
        panel.innerHTML = `
      <strong style="display:block;margin-bottom:5px;color:#8dff96;font-size:12px">EMU HALL OF FAME DIAGNOSTIC v${RUNTIME_VERSION}</strong>
      <div>Roster <b>${Array.isArray(roster) ? roster.length : 0}</b> &middot; Badges <b>${badges.length}</b> &middot; Visible <b>${visibleBadges.length}</b></div>
      <div>Hidden identities <b>${hiddenIdentityNodes.length}</b> &middot; Parsed IDs <b>${hiddenIdentityIds.length}</b> &middot; Rows <b>${rowNodes.length}</b></div>
      <div>Links <b>${profileLinks.length}</b> &middot; ID nodes <b>${idNodes.length}</b> &middot; Honor elements <b>${honorNodes.length}</b></div>
      <div>JSON <b>${capturedResponses.length}</b> &middot; Players <b>${capturedRecords.length}</b> &middot; Generic rows <b>${genericRows.length}</b></div>
      <code style="display:block;max-height:66px;margin:6px 0;padding:5px;overflow:auto;border:1px solid rgba(255,255,255,.14);background:#090c0a;color:#b9d8c2;font:10px/1.25 monospace;overflow-wrap:anywhere;white-space:normal">${escapeHtml(sample || "No usable Hall of Fame result structure found")}</code>
      <button type="button" style="margin-right:7px;border:1px solid #62d98a;border-radius:3px;background:#173021;color:#bfffc9;padding:5px 8px;font-weight:800">Copy diagnostic</button><span style="color:#9fb2a5;font-size:10px">Screenshot this card if copying is unavailable.</span>
    `;
        const button = panel.querySelector("button");
        button?.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(panel.dataset.diagnostic || details);
                button.textContent = "Copied";
            } catch (err) {
                button.textContent = "Copy unavailable";
            }
        }, { once: true });
    }

    function advancedSearchPayloadRecords(payload) {
        const groups = [];
        const visited = new WeakSet();
        let visitedCount = 0;
        const walk = (value, depth = 0) => {
            if (!value || typeof value !== "object" || depth > 9 || visitedCount > 8000 || visited.has(value)) return;
            visited.add(value);
            visitedCount += 1;
            const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item]) : Object.entries(value);
            const direct = [];
            entries.forEach(([key, item]) => {
                if (!item || typeof item !== "object") return;
                const record = advancedSearchRecordFromObject(item, key);
                if (record && !direct.some(existing => existing.id === record.id)) direct.push(record);
            });
            if (direct.length >= 2) groups.push(direct);
            entries.forEach(([, item]) => walk(item, depth + 1));
        };
        walk(payload);
        groups.sort((left, right) => right.length - left.length);
        return (groups[0] || []).slice(0, 250);
    }

    function advancedSearchRecordFromObject(value, fallbackKey = "") {
        if (!value || typeof value !== "object" || Array.isArray(value)) return null;
        const entries = Object.entries(value);
        const normalized = key => String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
        const nameEntry = entries.find(([key, item]) => /^(?:name|username|playername|displayname)$/i.test(normalized(key)) && typeof item === "string");
        const contextKeys = entries.map(([key]) => normalized(key));
        let playerId = 0;
        for (const [key, item] of entries) {
            const cleanKey = normalized(key);
            if (/^(?:playerid|userid|user2id|xid|targetid)$/.test(cleanKey) && /^\d{3,12}$/.test(String(item || ""))) {
                playerId = Number(item);
                break;
            }
            if (/^(?:href|url|profile|profileurl|link)$/.test(cleanKey) && typeof item === "string") {
                const extracted = extractPlayerId(item);
                if (extracted) {
                    playerId = Number(extracted);
                    break;
                }
            }
        }
        if (!playerId && nameEntry && /^\d{3,12}$/.test(String(value.id || ""))) playerId = Number(value.id);
        if (!playerId && nameEntry && /^\d{3,12}$/.test(String(fallbackKey || ""))) playerId = Number(fallbackKey);
        if (!playerId) return null;
        const hasPlayerContext = Boolean(nameEntry) || contextKeys.some(key => /player|user|honor|level|status|faction/.test(key));
        if (!hasPlayerContext) return null;
        return { id: playerId, name: compactText(nameEntry?.[1] || "") };
    }

    function advancedSearchReactRecords() {
        const header = advancedSearchRecordsHeader();
        if (!(header instanceof HTMLElement)) return [];
        const headerBottom = header.getBoundingClientRect().bottom;
        const combined = [];
        const seen = new Set();
        const nodes = Array.from(document.querySelectorAll("*")).slice(0, 5000);
        for (const node of nodes) {
            if (!(node instanceof HTMLElement) || node.closest("#emu-war-caller-root,[id*='chat'],[class*='chat']")) continue;
            const rect = node.getBoundingClientRect();
            if (rect.bottom < headerBottom - 4 || rect.top > headerBottom + 2200) continue;
            const reactKey = Object.keys(node).find(key => /^__reactProps\$|^__reactFiber\$/.test(key));
            if (!reactKey) continue;
            const root = /^__reactFiber\$/.test(reactKey) ? node[reactKey]?.memoizedProps : node[reactKey];
            const records = advancedSearchPayloadRecords(root);
            records.forEach(record => {
                if (!seen.has(record.id)) {
                    seen.add(record.id);
                    combined.push(record);
                }
            });
            if (combined.length >= 100) break;
        }
        return combined;
    }

    function advancedSearchDataRecords() {
        const now = Date.now();
        if (state.advancedSearchRecordsRevision === state.advancedSearchPayloadRevision && now - state.advancedSearchRecordsAt < 8000) {
            return state.advancedSearchRecords;
        }
        let best = [];
        let source = "";
        const responses = Array.isArray(state.pageData.advancedSearch) ? state.pageData.advancedSearch : [];
        responses.forEach(entry => {
            const records = advancedSearchPayloadRecords(entry?.payload);
            if (records.length >= best.length) {
                best = records;
                source = compactText(entry?.url || "captured JSON").slice(0, 160);
            }
        });
        if (!best.length) {
            best = advancedSearchReactRecords();
            if (best.length) source = "Torn page state";
        }
        state.advancedSearchRecords = best;
        state.advancedSearchRecordSource = source;
        state.advancedSearchRecordsAt = now;
        state.advancedSearchRecordsRevision = state.advancedSearchPayloadRevision;
        return best;
    }

    function advancedSearchGenericRowForNode(node, header) {
        if (!(node instanceof HTMLElement) || !(header instanceof HTMLElement)) return null;
        const headerRect = header.getBoundingClientRect();
        let best = null;
        for (let current = node, depth = 0; current && current !== document.body && depth < 9; current = current.parentElement, depth += 1) {
            if (!(current instanceof HTMLElement)) continue;
            const rect = current.getBoundingClientRect();
            if (rect.top < headerRect.bottom - 4 || rect.width < Math.max(170, headerRect.width * 0.68) || rect.height < 26 || rect.height > 100) continue;
            best = current;
            break;
        }
        return best;
    }

    function advancedSearchGenericRows(limit = 250) {
        const header = advancedSearchRecordsHeader();
        if (!(header instanceof HTMLElement)) return [];
        const headerRect = header.getBoundingClientRect();
        let best = [];
        let bestScore = 0;
        const containers = Array.from(document.querySelectorAll("div,section,main,ul,ol,tbody")).slice(0, 3500);
        containers.forEach(container => {
            if (!(container instanceof HTMLElement) || container.closest("#emu-war-caller-root,[id*='chat'],[class*='chat'],[class*='pagination'],[class*='pager'],[class*='page-number'],[class*='pageNumber']")) return;
            const children = Array.from(container.children || []).filter(child => {
                if (!(child instanceof HTMLElement) || child.closest("#emu-war-caller-root")) return false;
                const rect = child.getBoundingClientRect();
                if (rect.top < headerRect.bottom - 3 || rect.top > headerRect.bottom + 2400) return false;
                if (rect.width < Math.max(170, headerRect.width * 0.68) || rect.height < 26 || rect.height > 100) return false;
                const text = compactText(child);
                return !/^showing records\b/i.test(text) && !/^\d+(?:\s+\d+){1,12}$/.test(text);
            });
            if (children.length < 3 || children.length > 300) return;
            const distinctTops = new Set(children.map(child => Math.round(child.getBoundingClientRect().top / 3))).size;
            const score = distinctTops * 10 + children.length;
            if (distinctTops >= 3 && score > bestScore) {
                best = children;
                bestScore = score;
            }
        });
        return best.sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top).slice(0, limit);
    }

    function advancedSearchRecordHosts(records) {
        if (!records.length) return [];
        const mounted = Array.from(document.querySelectorAll("[data-emu-caller-advanced-search-bsp-host]")).map(host => ({
            record: { id: Number(host.dataset.emuCallerAdvancedSearchBspHost || 0), name: "" },
            host
        })).filter(item => item.record.id && item.host instanceof HTMLElement);
        const recordIds = new Set(records.map(record => Number(record?.id || 0)).filter(Boolean));
        if (mounted.length >= records.length && mounted.every(item => recordIds.has(item.record.id))) return mounted;
        if (mounted.length) clearAdvancedSearchBspMounts();
        const header = advancedSearchRecordsHeader();
        const matched = [];
        const used = new Set();
        if (header instanceof HTMLElement) {
            const textNodes = Array.from(document.querySelectorAll("span,div,p,strong,b")).filter(node => {
                if (!(node instanceof HTMLElement) || node.children.length > 4 || node.closest("#emu-war-caller-root,[id*='chat'],[class*='chat'],[class*='pagination'],[class*='pager'],[class*='page-number'],[class*='pageNumber']")) return false;
                const rect = node.getBoundingClientRect();
                const text = compactText(node);
                return rect.top >= header.getBoundingClientRect().bottom - 4 && rect.width > 0 && rect.height > 0 && text.length > 0 && text.length <= 80;
            }).slice(0, 5000);
            records.forEach(record => {
                if (!record.name) return;
                const needle = record.name.toLowerCase();
                const identity = textNodes.find(node => compactText(node).toLowerCase() === needle);
                const host = advancedSearchGenericRowForNode(identity, header);
                if (host && !used.has(host)) {
                    used.add(host);
                    matched.push({ record, host });
                }
            });
        }
        if (matched.length === records.length) return matched;
        const rows = advancedSearchGenericRows(records.length);
        if (rows.length !== records.length) return [];
        return rows.map((host, index) => ({ record: records[index], host })).filter(item => item.record?.id);
    }

    function enhanceAdvancedSearchBspTags() {
        clearAdvancedSearchBspColumns();
        const dataRecords = advancedSearchDataRecords();
        const expectedIds = new Set(dataRecords.map(record => Number(record?.id || 0)).filter(Boolean));
        const members = [];
        const candidateHosts = new Set();
        const candidates = [];
        document.querySelectorAll([
            "a[href^='/profiles.php?']", "a[href*='/profiles.php?']", "a[href*='profiles.php?XID=']",
            "a[onclick*='profiles.php']", ".name", ".honor-text-wrap", "[class*='honorWrap']",
            "[data-userid]", "[data-user-id]", "[data-playerid]", "[data-player-id]", "[data-xid]"
        ].join(",")).forEach(identity => {
            if (!(identity instanceof HTMLElement)) return;
            const host = advancedSearchProfileHost(identity);
            if (!(host instanceof HTMLElement) || candidateHosts.has(host)) return;
            const row = expandedBspRowForNode(host);
            if (row instanceof HTMLElement && row.querySelector("textarea,input[type='text'],input[type='search']")) return;
            const playerId = hallOfFamePlayerId(identity)
                || expandedBspPlayerId(identity, row || host)
                || hallOfFamePlayerId(host);
            if (!playerId) return;
            if (expectedIds.size && !expectedIds.has(Number(playerId))) return;
            candidateHosts.add(host);
            candidates.push({ id: Number(playerId), host, row: row || host });
        });
        const candidateIds = new Set(candidates.map(candidate => candidate.id));
        const completeCandidates = !expectedIds.size
            || (candidates.length === expectedIds.size && candidateIds.size === expectedIds.size);
        if (!completeCandidates && candidates.length) return [];
        if (completeCandidates) candidates.forEach(candidate => {
            candidate.host.dataset.emuCallerAdvancedSearchBspHost = String(candidate.id);
            ensureAdvancedSearchBspTag(candidate.host, candidate.id);
            members.push({ id: candidate.id, row: candidate.row });
        });
        if (!members.length) {
            advancedSearchRecordHosts(dataRecords).forEach(({ record, host }) => {
                if (!(host instanceof HTMLElement) || !record?.id || candidateHosts.has(host)) return;
                candidateHosts.add(host);
                host.dataset.emuCallerAdvancedSearchBspHost = String(record.id);
                ensureAdvancedSearchBspTag(host, record.id);
                members.push({ id: record.id, row: host });
            });
        }
        return members.slice(0, 250);
    }

    function advancedSearchProfileHost(identity) {
        if (!(identity instanceof HTMLElement)) return null;
        if (identity.closest("#emu-war-caller-root,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar'],[class*='pagination'],[class*='pager'],[class*='page-number'],[class*='pageNumber']")) return null;
        const profile = identity.matches("a[href],a[onclick]")
            ? identity
            : identity.closest("a[href*='profiles.php'],a[onclick*='profiles.php']")
            || identity.querySelector("a[href*='profiles.php'],a[onclick*='profiles.php']");
        const nativeHost = identity.closest(".name,.honor-text-wrap,[class*='honorWrap']")
            || profile?.parentElement?.matches?.("[class*='honorWrap']") && profile.parentElement
            || profile?.querySelector?.(".honor-text-wrap,[class*='honorWrap']")
            || profile;
        const host = nativeHost instanceof HTMLElement ? nativeHost : null;
        if (!(host instanceof HTMLElement)) return null;
        if (host.closest("#emu-war-caller-root,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar']")) return null;
        if (!hallOfFamePlayerId(identity) && !expandedBspPlayerId(identity, host) && !hallOfFamePlayerId(host)) return null;
        return host;
    }

    function clearAdvancedSearchBspColumns() {
        if (document.documentElement.dataset.emuCallerAdvancedSearchColumnsCleared === "true") return;
        document.documentElement.dataset.emuCallerAdvancedSearchColumnsCleared = "true";
        document.querySelectorAll(".emu-caller-faction-bsp-cell,.emu-caller-faction-bsp-header").forEach(node => node.remove());
        document.querySelectorAll("[data-emu-caller-expanded-bsp-row]").forEach(row => {
            row.removeAttribute("data-emu-caller-expanded-bsp-row");
            row.removeAttribute("data-emu-caller-faction-bsp-row");
        });
        document.querySelectorAll("[data-emu-caller-faction-bsp-header]").forEach(header => header.removeAttribute("data-emu-caller-faction-bsp-header"));
    }

    function ensureAdvancedSearchBspTag(host, playerId) {
        let badge = host.querySelector(":scope > .emu-caller-advanced-search-bsp");
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "emu-caller-advanced-search-bsp";
            badge.innerHTML = '<span class="emu-caller-advanced-search-bsp-inner"><span class="emu-caller-faction-bsp-value">--</span></span>';
            host.insertBefore(badge, host.firstChild);
        }
        const valueNode = badge.querySelector(".emu-caller-faction-bsp-value");
        const cached = state.bspPredictions.get(Number(playerId)) || {};
        const estimate = bspValueForId(playerId, host) || "--";
        const total = bspTotalValue(cached, estimate);
        if (valueNode) {
            valueNode.textContent = estimate;
            valueNode.dataset.tier = estimate === "--" ? "pending" : callerBspTier(total, cached);
        }
        badge.dataset.playerId = String(playerId);
        badge.title = `EmuControl BSP estimate: ${estimate} | Player ${playerId}`;
        return badge;
    }

    function advancedSearchRecordsHeader() {
        const nodes = Array.from(document.querySelectorAll("div,span,p,h1,h2,h3,h4,h5,header,li,tr,strong"))
            .filter(node => node instanceof HTMLElement && !node.closest("#emu-war-caller-root,[id*='chat'],[class*='chat']"))
            .filter(node => {
                const text = compactText(node);
                return /^showing records\s+\d+\s+through\s+\d+(?:\s+of\s+\d+)?$/i.test(text)
                    || /^name\s+level\s+user status icons$/i.test(text);
            });
        return nodes.sort((left, right) => {
            const leftIsColumns = /^name\s+level\s+user status icons$/i.test(compactText(left));
            const rightIsColumns = /^name\s+level\s+user status icons$/i.test(compactText(right));
            return Number(rightIsColumns) - Number(leftIsColumns)
                || left.children.length - right.children.length
                || left.getBoundingClientRect().top - right.getBoundingClientRect().top;
        })[0] || null;
    }

    function advancedSearchDiagnosticSignature(node) {
        const parts = [];
        let current = node instanceof HTMLElement ? node : null;
        for (let depth = 0; current && current !== document.body && depth < 5; depth += 1, current = current.parentElement) {
            const tag = current.tagName.toLowerCase();
            const classes = Array.from(current.classList || []).slice(0, 4).join(".");
            const attrs = Array.from(current.attributes || [])
                .filter(attr => /^(?:href|onclick|role|data-|aria-|alt|title|src)/i.test(attr.name))
                .slice(0, 8)
                .map(attr => {
                    if (/^(?:href|onclick)$/i.test(attr.name)) return `${attr.name}=${String(attr.value || "").replace(/\d{3,12}/g, "#").slice(0, 80)}`;
                    const numeric = String(attr.value || "").match(/^\d{3,12}$/)?.[0];
                    return numeric && /^data-/i.test(attr.name) ? `${attr.name}=#` : attr.name;
                });
            parts.push(`${tag}${classes ? `.${classes}` : ""}${attrs.length ? `[${attrs.join(",")}]` : ""}`);
        }
        return parts.join(" > ").slice(0, 520);
    }

    function enhanceExpandedBspLists() {
        const members = [];
        const seenRows = new Set();
        const selectors = [
            "a[href*='profiles.php']",
            "a[href*='XID=']",
            "a[onclick*='profiles.php']",
            "[data-userid]",
            "[data-user-id]",
            "[data-playerid]",
            "[data-player-id]",
            "[data-xid]"
        ].join(",");
        document.querySelectorAll(selectors).forEach(identityNode => {
            if (!(identityNode instanceof HTMLElement) || identityNode.closest("#emu-war-caller-root,[id*='chat'],[class*='chat'],[id*='sidebar'],[class*='sidebar']")) return;
            const row = expandedBspRowForNode(identityNode);
            if (!(row instanceof HTMLElement) || seenRows.has(row)) return;
            const playerId = expandedBspPlayerId(identityNode, row);
            if (!playerId) return;
            const profileLinks = row.querySelectorAll("a[href*='profiles.php'],a[href*='XID=']");
            if (profileLinks.length > 4 || row.querySelector("textarea,input[type='text'],input[type='search']")) return;
            const profile = identityNode.closest("a") || row.querySelector("a[href*='profiles.php'],a[href*='XID=']") || identityNode;
            const hostCell = directRowChild(profile, row);
            if (!hostCell || hostCell === row) return;
            seenRows.add(row);
            row.dataset.emuCallerFactionBspRow = String(playerId);
            row.dataset.emuCallerExpandedBspRow = "true";
            ensureStandardFactionBspHeader(row, hostCell);
            ensureStandardFactionBspCell(row, playerId, hostCell);
            members.push({ id: playerId, row });
        });
        return members.slice(0, 250);
    }

    function russianRoulettePlayerMount(identityNode, playerId) {
        if (!(identityNode instanceof HTMLElement)) return null;
        const directAnchor = identityNode.matches("a[href],a[onclick]") ? identityNode : null;
        if (directAnchor && Number(expandedBspPlayerId(directAnchor, directAnchor.parentElement)) === Number(playerId)) {
            return directAnchor;
        }
        const anchors = Array.from(identityNode.querySelectorAll?.("a[href],a[onclick]") || []);
        return anchors.find(anchor =>
            Number(expandedBspPlayerId(anchor, anchor.parentElement)) === Number(playerId)
        ) || identityNode;
    }

    function russianRouletteHasExistingBsp(mount) {
        const scope = mount?.parentElement;
        if (!(scope instanceof HTMLElement)) return false;
        return Array.from(scope.querySelectorAll(
            ".emu-war-bsp-badge,.tt-stats-estimate,.ffscouter-cell,[class*='tdub' i],[id*='tdub' i],[data-bsp],[data-bs-estimate],[data-battle-stats]"
        )).some(node => !node.closest("[data-emu-caller-native='true']"));
    }

    function paintRussianRouletteBspTag(badge, playerId, row) {
        if (!(badge instanceof HTMLElement) || !playerId) return null;
        const prediction = state.bspPredictions.get(Number(playerId)) || {};
        const estimate = bspValueForId(playerId, row) || "--";
        const valueNode = badge.querySelector(".emu-caller-faction-bsp-value");
        if (valueNode) {
            valueNode.textContent = estimate;
            valueNode.dataset.tier = estimate === "--"
                ? "pending"
                : callerBspTier(bspTotalValue(prediction, estimate), prediction);
        }
        badge.dataset.playerId = String(playerId);
        badge.title = estimate === "--"
            ? `EmuControl BSP estimate pending | Player ${playerId}`
            : `EmuControl BSP estimate: ${estimate} | Player ${playerId}`;
        badge.setAttribute("aria-label", badge.title);
        return badge;
    }

    function enhanceRussianRouletteBspTags() {
        if (!isRussianRouletteBspPage()) return [];
        const root = document.querySelector("#mainContainer,#main-content,main") || document.body;
        const selector = [
            "a[href*='profiles.php']",
            "a[href*='XID=']",
            "a[onclick*='profiles.php']",
            "[data-userid]",
            "[data-user-id]",
            "[data-playerid]",
            "[data-player-id]",
            "[data-xid]"
        ].join(",");
        const ownerId = Number(state.owner?.id || state.owner?.playerId || state.owner?.player_id || 0);
        const members = [];
        const seenMounts = new Set();
        const activeBadges = new Set();
        Array.from(root.querySelectorAll(selector)).slice(0, 160).forEach(identityNode => {
            if (!(identityNode instanceof HTMLElement) || identityNode.closest("#emu-war-caller-root,#chatRoot,#sidebarroot,#sidebar,[data-emu-caller-native='true']")) return;
            const row = expandedBspRowForNode(identityNode)
                || identityNode.closest("li,tr,[class*='game'],[class*='table'],[class*='player']")
                || identityNode.parentElement;
            const playerId = expandedBspPlayerId(identityNode, row);
            if (!playerId || Number(playerId) === ownerId) return;
            const mount = russianRoulettePlayerMount(identityNode, playerId);
            if (!(mount instanceof HTMLElement) || seenMounts.has(mount) || !mount.getClientRects().length) return;
            seenMounts.add(mount);
            let badge = mount.querySelector(":scope > .emu-caller-roulette-bsp");
            if (russianRouletteHasExistingBsp(mount)) {
                badge?.remove();
                mount.classList.remove("emu-caller-roulette-bsp-host");
                return;
            }
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "emu-caller-roulette-bsp";
                badge.setAttribute("data-emu-caller-native", "true");
                badge.innerHTML = '<span class="emu-caller-faction-bsp-value">--</span>';
                mount.appendChild(badge);
            }
            mount.classList.add("emu-caller-roulette-bsp-host");
            badge.dataset.emuCallerRouletteBsp = "true";
            paintRussianRouletteBspTag(badge, playerId, row);
            activeBadges.add(badge);
            members.push({ id: Number(playerId), row });
        });
        document.querySelectorAll(".emu-caller-roulette-bsp").forEach(badge => {
            if (activeBadges.has(badge)) return;
            const host = badge.parentElement;
            badge.remove();
            host?.classList?.remove("emu-caller-roulette-bsp-host");
        });
        return members.slice(0, 100);
    }

    function clearRussianRouletteBspTags() {
        document.querySelectorAll(".emu-caller-roulette-bsp").forEach(node => node.remove());
        document.querySelectorAll(".emu-caller-roulette-bsp-host").forEach(node => node.classList.remove("emu-caller-roulette-bsp-host"));
    }

    function ensureTargetsListBspTag(host, playerId, row) {
        if (!(host instanceof HTMLElement) || !(row instanceof HTMLElement)) return null;
        let badge = host.querySelector(":scope > .emu-caller-target-list-bsp");
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "emu-caller-target-list-bsp";
            badge.innerHTML = '<span class="emu-caller-faction-bsp-value">--</span>';
            host.insertBefore(badge, host.firstChild);
        }
        const valueNode = badge.querySelector(".emu-caller-faction-bsp-value");
        const cached = state.bspPredictions.get(Number(playerId)) || {};
        const estimate = bspValueForId(playerId, row) || "--";
        const total = bspTotalValue(cached, estimate);
        if (valueNode) {
            valueNode.textContent = estimate;
            valueNode.dataset.tier = estimate === "--" ? "pending" : callerBspTier(total, cached);
        }
        badge.dataset.playerId = String(playerId);
        badge.title = estimate === "--"
            ? `EmuControl BSP estimate pending | Player ${playerId}`
            : `EmuControl BSP estimate: ${estimate} | Player ${playerId}`;
        return badge;
    }

    function enhanceTargetsListBspTags() {
        const members = [];
        const seenRows = new Set();
        const selector = "li[class*='tableRow'] a[href*='profiles.php?XID='],li[class*='table-row'] a[href*='profiles.php?XID=']";
        document.querySelectorAll(selector).forEach(profile => {
            if (!(profile instanceof HTMLElement) || profile.closest("#emu-war-caller-root,#chatRoot,#sidebarroot,#sidebar")) return;
            const row = profile.closest("li[class*='tableRow'],li[class*='table-row']");
            if (!(row instanceof HTMLElement) || seenRows.has(row)) return;
            const playerId = extractPlayerId(profile.getAttribute("href") || profile.href || "");
            const content = row.querySelector(":scope > [class*='contentGroup']") || row.firstElementChild;
            const description = content?.querySelector?.(":scope > [class*='description']");
            if (!playerId || !(description instanceof HTMLElement)) return;
            seenRows.add(row);
            row.dataset.emuCallerTargetListBspRow = String(playerId);
            description.dataset.emuCallerTargetListBspHost = String(playerId);
            ensureTargetsListBspTag(description, playerId, row);
            members.push({ id: playerId, row });
        });
        return members.slice(0, 100);
    }

    function enhanceFactionChainBspTags() {
        const members = [];
        const root = factionChainRecentAttacksRoot();
        if (!(root instanceof HTMLElement)) return members;
        const selector = "a[href*='profiles.php?XID='],a[href*='profiles.php'][href*='XID=']";
        Array.from(root.querySelectorAll(selector)).slice(0, 120).forEach(profile => {
            if (!(profile instanceof HTMLElement) || profile.closest("#emu-war-caller-root,#chatRoot,#sidebarroot,#sidebar")) return;
            const rel = String(profile.getAttribute("rel") || "").toLowerCase();
            if (!rel.includes("noopener") || !rel.includes("noreferrer")) return;
            const row = factionChainAttackRow(profile) || profile.parentElement || root;
            const playerId = expandedBspPlayerId(profile, row);
            if (!playerId) return;
            if (row instanceof HTMLElement && row !== root) row.dataset.emuCallerChainAttackRow = "true";
            ensureFactionChainBspTag(profile, playerId);
            members.push({ id: playerId, row: row instanceof HTMLElement ? row : null });
        });
        return members.slice(0, 100);
    }

    function factionChainAttackRow(profile) {
        let current = profile;
        for (let depth = 0; current && current !== document.body && depth < 10; depth += 1, current = current.parentElement) {
            if (!(current instanceof HTMLElement) || !current.matches("tr,li")) continue;
            const links = current.querySelectorAll("a[href*='profiles.php'],a[href*='XID=']");
            const rect = current.getBoundingClientRect?.() || {};
            if (links.length >= 2 && links.length <= 6 && (!rect.width || rect.width >= 240) && (!rect.height || rect.height <= 120)) return current;
        }
        return null;
    }

    function ensureFactionChainBspTag(profile, playerId) {
        const host = profile.parentElement;
        if (!(host instanceof HTMLElement)) return null;
        host.classList.add("emu-caller-chain-bsp-host");
        const existing = host.querySelector(`:scope > .emu-caller-chain-attack-bsp[data-player-id="${playerId}"]`);
        const badge = existing || document.createElement("span");
        if (!existing) {
            badge.className = "emu-caller-chain-attack-bsp";
            badge.innerHTML = '<span class="emu-caller-faction-bsp-value">--</span>';
            host.insertBefore(badge, host.firstChild || null);
        }
        badge.dataset.playerId = String(playerId);
        return paintFactionChainBspTag(badge, playerId);
    }

    function paintFactionChainBspTag(badge, playerId) {
        if (!(badge instanceof HTMLElement)) return null;
        const valueNode = badge.querySelector(".emu-caller-faction-bsp-value");
        const cached = state.bspPredictions.get(Number(playerId)) || {};
        const estimate = bspValueForId(playerId, badge.closest("[data-emu-caller-chain-attack-row]") || badge.parentElement) || "--";
        const total = bspTotalValue(cached, estimate);
        const tier = estimate === "--" ? "pending" : callerBspTier(total, cached);
        if (valueNode && valueNode.textContent !== estimate) valueNode.textContent = estimate;
        if (valueNode) valueNode.dataset.tier = tier;
        badge.title = estimate === "--" ? `EmuControl BSP estimate pending | Player ${playerId}` : `EmuControl BSP estimate: ${estimate} | Player ${playerId}`;
        return badge;
    }

    function expandedBspRowForNode(node) {
        let current = node;
        for (let depth = 0; current && current !== document.body && depth < 10; depth += 1, current = current.parentElement) {
            if (!(current instanceof HTMLElement)) continue;
            if (!current.matches("tr,li,[class*='table-row'],[class*='list-row'],[class*='list-item'],[class*='user-row'],[class*='member-row'],[class*='row']")) continue;
            const width = current.getBoundingClientRect?.().width || current.offsetWidth || 0;
            if (width && width < 180) continue;
            return current;
        }
        return null;
    }

    function expandedBspPlayerId(node, row) {
        const values = [
            node.getAttribute?.("href"), node.getAttribute?.("onclick"), node.getAttribute?.("data-userid"),
            node.getAttribute?.("data-user-id"), node.getAttribute?.("data-playerid"), node.getAttribute?.("data-player-id"),
            node.getAttribute?.("data-user"), node.getAttribute?.("data-player"), node.getAttribute?.("data-xid"),
            node.getAttribute?.("data-id"), node.getAttribute?.("aria-label"), node.getAttribute?.("title"),
            node.getAttribute?.("alt"), node.getAttribute?.("data-tooltip"), node.getAttribute?.("data-title"),
            node.getAttribute?.("data-tip"), node.getAttribute?.("data-content"), node.dataset?.userid,
            node.dataset?.userId, node.dataset?.user, node.dataset?.playerid, node.dataset?.playerId,
            node.dataset?.player, node.dataset?.xid, node.dataset?.id, row?.dataset?.userid,
            row?.dataset?.userId, row?.dataset?.playerId, node.innerHTML, node.textContent,
            ...Object.values(node.dataset || {})
        ];
        for (const value of values) {
            const bracketed = String(value || "").match(/\[(\d{3,12})\]/);
            const id = extractPlayerId(value) || (bracketed ? Number(bracketed[1]) : 0) || (/^\d{3,12}$/.test(String(value || "")) ? Number(value) : 0);
            if (id) return Number(id);
        }
        return extractPlayerId(String(row?.outerHTML || "").slice(0, 5000)) || 0;
    }

    function enhanceStandardFactionBspTable() {
        const members = [];
        const seenRows = new Set();
        const bodies = new Set();
        const roots = Array.from(document.querySelectorAll(".members-list,[class*='membersList'],[class*='memberList'],[class*='member-list'],[class*='members-list']"))
            .filter(root => root instanceof HTMLElement && !root.closest(".faction-war,#emu-war-caller-root,#chatRoot,#sidebarroot,#sidebar"));
        const profiles = roots.flatMap(root => Array.from(root.querySelectorAll("a[href*='profiles.php'],a[href^='/profiles']")));
        profiles.forEach(profile => {
            if (!(profile instanceof HTMLElement) || profile.closest(".faction-war,#emu-war-caller-root,[data-emu-caller-native='true']")) return;
            const row = profile.closest("li.table-row,li[class*='tableRow'],[class*='table-row'],tr,li");
            if (!(row instanceof HTMLElement) || seenRows.has(row)) return;
            if (row.querySelectorAll("a[href*='profiles.php'],a[href^='/profiles']").length > 4) return;
            const level = standardFactionCell(row, "level");
            const icons = standardFactionCell(row, "icons");
            const playerId = extractPlayerId(profile.getAttribute("href") || profile.href || "");
            if (!level || !icons || !playerId) return;
            seenRows.add(row);
            row.dataset.emuCallerFactionBspRow = String(playerId);
            if (row.dataset.emuCallerFactionBspOriginalOrder === undefined) {
                row.dataset.emuCallerFactionBspOriginalOrder = String(Array.from(row.parentElement?.children || []).indexOf(row));
            }
            if (row.parentElement instanceof HTMLElement) bodies.add(row.parentElement);
            ensureStandardFactionBspHeader(row);
            ensureStandardFactionBspCell(row, playerId);
            members.push({ id: playerId, row });
        });
        bodies.forEach(body => applyStandardFactionBspSort(body));
        return members;
    }

    function standardFactionCell(row, key) {
        const patterns = {
            level: /(?:^|[_-])(?:level|lvl)(?:[_-]|$)/i,
            icons: /(?:^|[_-])icons?(?:[_-]|$)/i,
            status: /(?:^|[_-])status(?:[_-]|$)/i
        };
        const pattern = patterns[key] || new RegExp(`(?:^|[_-])${key}(?:[_-]|$)`, "i");
        return Array.from(row?.children || []).find(node =>
            node instanceof HTMLElement && Array.from(node.classList || []).some(name => pattern.test(name))
        ) || null;
    }

    function ensureStandardFactionBspHeader(row, profileCell = null) {
        const body = row.parentElement;
        const container = body?.parentElement;
        const candidates = [
            body?.previousElementSibling,
            container?.querySelector(":scope > .table-header"),
            container?.querySelector(":scope > [class*='table-header']"),
            container?.querySelector(".table-header,[class*='table-header']")
        ].filter(node => node instanceof HTMLElement);
        const rowChildren = Array.from(row.children || []);
        const profileIndex = profileCell ? rowChildren.indexOf(profileCell) : -1;
        const header = candidates.find(node => {
            const hasKnownColumn = standardFactionCell(node, "level") || standardFactionCell(node, "icons") || standardFactionCell(node, "status");
            return hasKnownColumn || (profileIndex >= 0 && node.children?.length >= rowChildren.length - 1);
        });
        if (!header) return;
        header.dataset.emuCallerFactionBspHeader = "true";
        let cell = header.querySelector(":scope > .emu-caller-faction-bsp-header");
        if (!cell) {
            const level = standardFactionCell(header, "level");
            const before = standardFactionCell(header, "status") || standardFactionCell(header, "icons");
            cell = document.createElement(level?.tagName === "LI" ? "li" : "div");
            cell.className = "emu-caller-faction-bsp-header";
            if (level) level.after(cell);
            else if (before) before.before(cell);
            else if (profileIndex >= 0 && header.children[profileIndex]) header.children[profileIndex].after(cell);
            else header.appendChild(cell);
        }
        if (body instanceof HTMLElement && body.closest(".members-list,[class*='membersList'],[class*='memberList'],[class*='member-list'],[class*='members-list']") && isStandardFactionBspPage()) {
            bindStandardFactionBspSort(cell, body);
        } else if (!cell.textContent) {
            cell.textContent = "BSP";
        }
    }

    function bindStandardFactionBspSort(headerCell, body) {
        if (!(headerCell instanceof HTMLElement) || !(body instanceof HTMLElement)) return;
        if (!body.dataset.emuCallerFactionBspSort) body.dataset.emuCallerFactionBspSort = "none";
        const header = headerCell.parentElement;
        if (header instanceof HTMLElement) {
            header.emuCallerFactionBspBody = body;
            if (header.dataset.emuCallerNativeFactionSortBound !== "true") {
                header.dataset.emuCallerNativeFactionSortBound = "true";
                const releaseNativeSort = event => {
                    const target = event.target instanceof Element ? event.target : null;
                    if (!target || target.closest(".emu-caller-faction-bsp-header")) return;
                    const currentBody = header.emuCallerFactionBspBody;
                    const currentHeaderCell = header.querySelector(":scope > .emu-caller-faction-bsp-header");
                    releaseStandardFactionBspSort(currentBody, currentHeaderCell);
                };
                header.addEventListener("click", releaseNativeSort, true);
                header.addEventListener("keydown", event => {
                    if (event.key === "Enter" || event.key === " ") releaseNativeSort(event);
                }, true);
            }
        }
        if (headerCell.dataset.emuCallerFactionBspSortBound !== "true") {
            headerCell.dataset.emuCallerFactionBspSortBound = "true";
            headerCell.setAttribute("role", "button");
            headerCell.tabIndex = 0;
            const cycle = event => {
                event.preventDefault();
                event.stopPropagation();
                cycleStandardFactionBspSort(body);
            };
            headerCell.addEventListener("click", cycle);
            headerCell.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") cycle(event);
            });
        }
        updateStandardFactionBspSortHeader(headerCell, body.dataset.emuCallerFactionBspSort);
    }

    function cycleStandardFactionBspSort(body) {
        if (!(body instanceof HTMLElement)) return;
        const current = body.dataset.emuCallerFactionBspSort || "none";
        const next = current === "none" ? "desc" : current === "desc" ? "asc" : "none";
        if (current === "none") rememberStandardFactionBspOrder(body);
        body.dataset.emuCallerFactionBspSort = next;
        if (next === "none") {
            restoreStandardFactionBspOrder(body);
            updateStandardFactionBspSortHeader(standardFactionBspHeaderForBody(body), next);
            return;
        }
        applyStandardFactionBspSort(body);
    }

    function rememberStandardFactionBspOrder(body) {
        if (!(body instanceof HTMLElement)) return;
        Array.from(body.children)
            .filter(row => row instanceof HTMLElement && row.matches("[data-emu-caller-faction-bsp-row]"))
            .forEach((row, index) => {
                row.dataset.emuCallerFactionBspOriginalOrder = String(index);
            });
    }

    function restoreStandardFactionBspOrder(body) {
        if (!(body instanceof HTMLElement)) return;
        const rows = Array.from(body.children)
            .filter(row => row instanceof HTMLElement && row.matches("[data-emu-caller-faction-bsp-row]"))
            .sort((left, right) =>
                Number(left.dataset.emuCallerFactionBspOriginalOrder || 0)
                - Number(right.dataset.emuCallerFactionBspOriginalOrder || 0)
            );
        rows.forEach((row, index) => {
            if (body.children[index] !== row) body.insertBefore(row, body.children[index] || null);
        });
    }

    function standardFactionBspHeaderForBody(body) {
        if (!(body instanceof HTMLElement)) return null;
        return body.previousElementSibling?.querySelector?.(":scope > .emu-caller-faction-bsp-header")
            || body.parentElement?.querySelector?.("[data-emu-caller-faction-bsp-header] > .emu-caller-faction-bsp-header")
            || null;
    }

    function releaseStandardFactionBspSort(body, headerCell) {
        if (!(body instanceof HTMLElement)) return;
        body.dataset.emuCallerFactionBspSort = "none";
        updateStandardFactionBspSortHeader(headerCell, "none");
        [0, 50, 150, 400].forEach(delay => window.setTimeout(() => {
            if (body.dataset.emuCallerFactionBspSort === "none") rememberStandardFactionBspOrder(body);
        }, delay));
    }

    function standardFactionBspSortValue(row) {
        const playerId = Number(row?.dataset?.emuCallerFactionBspRow || 0);
        if (!playerId) return null;
        const prediction = state.bspPredictions.get(playerId) || {};
        const total = bspTotalValue(prediction, bspValueForId(playerId, row));
        return Number.isFinite(total) && total > 0 ? total : null;
    }

    function applyStandardFactionBspSort(body = null) {
        const bodies = body instanceof HTMLElement
            ? [body]
            : Array.from(document.querySelectorAll("[data-emu-caller-faction-bsp-sort]"));
        bodies.forEach(currentBody => {
            if (!(currentBody instanceof HTMLElement)) return;
            const direction = currentBody.dataset.emuCallerFactionBspSort || "none";
            const headerCell = standardFactionBspHeaderForBody(currentBody);
            if (direction === "none") {
                updateStandardFactionBspSortHeader(headerCell, direction);
                return;
            }
            const rows = Array.from(currentBody.children).filter(row => row instanceof HTMLElement && row.matches("[data-emu-caller-faction-bsp-row]"));
            const originalOrder = row => Number(row.dataset.emuCallerFactionBspOriginalOrder || 0);
            const sorted = [...rows].sort((left, right) => {
                const leftValue = standardFactionBspSortValue(left);
                const rightValue = standardFactionBspSortValue(right);
                if (leftValue === null && rightValue !== null) return 1;
                if (rightValue === null && leftValue !== null) return -1;
                if (leftValue !== null && rightValue !== null && leftValue !== rightValue) {
                    return direction === "desc" ? rightValue - leftValue : leftValue - rightValue;
                }
                return originalOrder(left) - originalOrder(right);
            });
            sorted.forEach((row, index) => {
                if (currentBody.children[index] !== row) currentBody.insertBefore(row, currentBody.children[index] || null);
            });
            updateStandardFactionBspSortHeader(headerCell, direction);
        });
    }

    function updateStandardFactionBspSortHeader(headerCell, direction = "none") {
        if (!(headerCell instanceof HTMLElement)) return;
        const normalized = ["asc", "desc"].includes(direction) ? direction : "none";
        headerCell.dataset.sortDirection = normalized;
        headerCell.textContent = normalized === "desc" ? "BSP \u25BC" : normalized === "asc" ? "BSP \u25B2" : "BSP \u2195";
        headerCell.title = normalized === "desc"
            ? "BSP sorted highest to lowest. Click for lowest first."
            : normalized === "asc"
                ? "BSP sorted lowest to highest. Click to restore Torn's order."
                : "Sort faction members by estimated battle stats.";
        headerCell.setAttribute("aria-label", headerCell.title);
    }

    function ensureStandardFactionBspCell(row, playerId, profileCell = null) {
        let cell = row.querySelector(":scope > .emu-caller-faction-bsp-cell");
        if (!cell) {
            const level = standardFactionCell(row, "level");
            const before = standardFactionCell(row, "status") || standardFactionCell(row, "icons");
            const anchorCell = profileCell || directRowChild(row.querySelector("a[href*='profiles.php'],a[href*='XID=']"), row);
            if (!level && !before && !anchorCell) return null;
            cell = document.createElement(level?.tagName === "LI" ? "li" : "div");
            cell.className = "emu-caller-faction-bsp-cell";
            cell.innerHTML = '<span class="emu-caller-faction-bsp-value">--</span>';
            if (level) level.after(cell);
            else if (before) before.before(cell);
            else anchorCell.after(cell);
        }
        const valueNode = cell.querySelector(".emu-caller-faction-bsp-value");
        const cached = state.bspPredictions.get(Number(playerId)) || {};
        const estimate = bspValueForId(playerId, row) || "--";
        const total = bspTotalValue(cached, estimate);
        const tier = estimate === "--" ? "pending" : callerBspTier(total, cached);
        if (valueNode.textContent !== estimate) valueNode.textContent = estimate;
        valueNode.dataset.tier = tier;
        valueNode.title = `EmuControl BSP estimate: ${estimate} | Player ${playerId}`;
        return cell;
    }

    function ensureProfileBspBox(playerId) {
        const host = findCallerProfileBspHost(playerId);
        const header = host?.header;
        const container = host?.container;
        const existingBoxes = Array.from(document.querySelectorAll(".emu-caller-profile-bsp-box"));
        if (!(header instanceof HTMLElement) || !(container instanceof HTMLElement)) {
            existingBoxes.forEach(box => box.remove());
            return null;
        }
        header.dataset.emuCallerProfileInfoHeader = "true";
        let box = existingBoxes.find(node => node.parentElement === container) || existingBoxes[0];
        if (!box) {
            box = document.createElement("span");
            box.className = "emu-caller-profile-bsp-box";
            box.innerHTML = '<b>BSP</b><strong>--</strong>';
        }
        existingBoxes.filter(node => node !== box).forEach(node => node.remove());
        const allianceWarning = header.querySelector(":scope > .emu-caller-profile-alliance-warning");
        if (allianceWarning) header.insertBefore(box, allianceWarning);
        else if (box.parentElement !== header) header.appendChild(box);
        box.dataset.playerId = String(playerId);
        const cached = state.bspPredictions.get(Number(playerId)) || {};
        const estimate = bspValueForId(playerId, null) || "--";
        const total = bspTotalValue(cached, estimate);
        box.dataset.tier = estimate === "--" ? "pending" : callerBspTier(total, cached);
        const valueNode = box.querySelector("strong");
        if (valueNode.textContent !== estimate) valueNode.textContent = estimate;
        box.title = `EmuControl BSP estimate: ${estimate} | Player ${playerId}`;
        return box;
    }

    function findCallerProfileBspHost() {
        const panels = Array.from(document.querySelectorAll(".user-information,[class*='userInformation']"))
            .filter(container => container instanceof HTMLElement)
            .filter(container => !container.closest("#emu-war-caller-root,.emu-caller-profile-bsp-box"))
            .map(container => {
                const header = Array.from(container.querySelectorAll(".title-black,[class*='title'],h1,h2,h3,h4,h5"))
                    .find(node =>
                        node instanceof HTMLElement && compactText(node).toLowerCase().startsWith("user information")
                    );
                const mountContainer = header?.parentElement;
                return { header, container: mountContainer, profileContainer: container };
            })
            .filter(item => item.header instanceof HTMLElement && item.container instanceof HTMLElement)
            .filter(item => callerProfileHeaderVisible(item.header) && callerProfileHeaderVisible(item.container))
            .filter(item => callerPrimaryProfileInfoPanel(item.profileContainer))
            .sort((left, right) => left.header.getBoundingClientRect().top - right.header.getBoundingClientRect().top);
        return panels[0] || null;
    }

    function callerProfileHeaderVisible(node) {
        const rect = node.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 12) return false;
        const style = window.getComputedStyle(node);
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
    }

    function callerLowerProfileStatsPanel(container) {
        const text = compactText(container).toLowerCase();
        return /view other stats|relative values|stakeout|spy report|attack history|there is no spy report/.test(text);
    }

    function callerPrimaryProfileInfoPanel(container) {
        const text = compactText(container).toLowerCase();
        return !callerLowerProfileStatsPanel(container) && text.includes("level") && text.includes("rank");
    }

    function warBspRoster(mountedMembers) {
        const members = new Map();
        (mountedMembers || []).forEach(member => {
            const id = Number(member?.id);
            if (Number.isFinite(id) && id > 0) members.set(id, member);
        });
        state.targetMeta.forEach((_meta, key) => {
            const id = Number(key);
            if (Number.isFinite(id) && id > 0 && !members.has(id)) members.set(id, { id, row: null });
        });
        return Array.from(members.values());
    }

    function renderWarChainWatcher() {
        document.querySelectorAll("#emu-caller-chain-watch, .emu-caller-chain-panel").forEach(node => node.remove());
    }

    function collectTargetRows() {
        const warLists = Array.from(document.querySelectorAll(".faction-war .members-list"));
        const roots = warLists.length ? warLists : [document];
        const attackLinks = roots.flatMap(root => Array.from(root.querySelectorAll("a[href*='sid=attack'], a[href*='attack.php'], a[href*='loader.php']")))
            .filter(link => /attack/i.test(link.textContent || link.href || ""))
            .filter(link => !link.closest(".emu-caller-cat-row"))
            .filter(link => !link.closest("#emu-war-caller-root, #emu-caller-attack-hint, #emu-caller-rally-toasts"));
        const rows = [];
        const seen = new Set();
        const addTargetRow = (row, link = null) => {
            if (!row || seen.has(row)) return;
            const profile = nativeWarProfileLink(row) || nearestProfileLink(row);
            const href = profile?.href || link?.href || "";
            const id = extractPlayerId(href);
            if (!id) return;
            seen.add(row);
            rows.push({
                id,
                name: cleanName(profile?.textContent || row.textContent || `Player ${id}`),
                row,
                profileLink: profile,
                attackLink: link || null,
                meta: state.targetMeta.get(Number(id)) || null,
                status: statusFromTargetMeta(id) || rowStatus(row)
            });
        };
        attackLinks.forEach(link => addTargetRow(findRow(link), link));
        warLists.forEach(list => {
            const listRows = Array.from(new Set(list.querySelectorAll(".table-body > .table-row, li.enemy, li.your, li[class*='enemy___'], li[class*='your___']")))
                .filter(row => row instanceof HTMLElement);
            if (nativeWarListSide(list, listRows, new Map()) !== "enemy") return;
            listRows.forEach(row => {
                const attackLink = row.querySelector("a[href*='sid=attack'], a[href*='attack.php'], a[href*='loader.php']");
                addTargetRow(row, attackLink);
            });
        });
        return rows;
    }

    function enhanceNativeWarTables(targetRows) {
        const targetByRow = new Map((targetRows || []).map(target => [target.row, target]));
        const targetById = new Map((targetRows || []).map(target => [Number(target.id), target]));
        const allMembers = [];
        const lists = Array.from(document.querySelectorAll(".faction-war .members-list"));
        document.querySelectorAll("[data-emu-war-table-mounted='true'],.emu-caller-cat-board").forEach(node => node.remove());
        document.querySelectorAll(".faction-war.emu-caller-compact-war,.faction-war.emu-caller-two-column-war,.faction-war.emu-caller-wide-war").forEach(root => {
            root.classList.remove("emu-caller-compact-war", "emu-caller-two-column-war", "emu-caller-wide-war");
            root.style.removeProperty("--emu-caller-wide-war-width");
        });
        alignNativeWarPanels(lists);
        lists.forEach(list => {
            list.removeAttribute("data-emu-war-table-host");
            list.removeAttribute("data-emu-war-table-inactive");
            const rows = Array.from(new Set(list.querySelectorAll(".table-body > .table-row, li.enemy, li.your, li[class*='enemy___'], li[class*='your___']")))
                .filter(row => row instanceof HTMLElement && !row.closest("[data-emu-caller-native='true']"));
            if (!rows.length) return;
            const listSide = nativeWarListSide(list, rows, targetByRow);
            list.setAttribute("data-emu-caller-native-table", "true");
            list.setAttribute("data-emu-caller-native-side", listSide);
            ensureWarBspHeader(list);
            const header = findWarHeaderRow(list);
            if (header) {
                header.setAttribute("data-emu-caller-native-header", "true");
                header.setAttribute("data-emu-caller-native-side", listSide);
                header.querySelector(":scope > .emu-caller-native-last-header")?.remove();
                configureNativeSortHeaders(header, listSide);
            }
            const members = [];
            rows.forEach(row => {
                const profile = nativeWarProfileLink(row);
                const id = warRowPlayerId(row, profile);
                if (!id) return;
                const rowTarget = targetByRow.get(row) || null;
                const provisionalSide = nativeWarRowSide(row, listSide, rowTarget);
                const target = rowTarget || (provisionalSide === "enemy" ? targetById.get(Number(id)) || null : null);
                const side = nativeWarRowSide(row, listSide, target);
                const member = { row, profile, id, target, side };
                members.push(member);
                allMembers.push({ id, row });
                row.querySelector(":scope > .emu-caller-native-last")?.remove();
                row.querySelector(":scope > .emu-caller-clock-cell")?.remove();
                const needsEnhancement = prepareNativeWarRow(row, id, side, target);
                row.setAttribute("data-emu-caller-native-row", "true");
                row.setAttribute("data-emu-caller-native-side", side);
                ensureNativeMemberIndicator(row, profile, id);
                ensureNativeStatusTimer(row, id, target);
                if (needsEnhancement) {
                    ensureWarBspCell(row);
                    if (side === "own") ensureNativeCooldownCell(row, id);
                    else row.querySelector(":scope > .emu-caller-native-cd")?.remove();
                    if (target) mountWarInfo(target);
                }
            });
            applyNativeWarSort(members, listSide);
        });
        return allMembers;
    }

    function alignNativeWarPanels(lists) {
        const warRoot = lists.find(list => list.closest(".faction-war"))?.closest(".faction-war");
        if (!(warRoot instanceof HTMLElement) || lists.length < 2) return;
        const panels = Array.from(new Set(lists.map(list =>
            list.closest(".enemy-faction,.your-faction,[class*='enemy-faction'],[class*='your-faction']") || list
        ).filter(panel => panel instanceof HTMLElement)));
        if (panels.length < 2) return;
        warRoot.classList.add("emu-caller-two-column-war");
        panels.forEach(panel => {
            const side = nativeWarListSide(panel.querySelector(".members-list") || panel, [], new Map());
            panel.classList.add("emu-caller-native-panel");
            panel.setAttribute("data-emu-caller-native-panel-side", side);
        });
        const parent = panels[0].parentElement;
        if (parent && panels.every(panel => panel.parentElement === parent)) parent.classList.add("emu-caller-native-panel-row");
    }

    function prepareNativeWarRow(row, id, side, target) {
        const nextId = String(Number(id));
        const previousId = row.dataset.emuCallerNativePlayerId || "";
        const previousSide = row.dataset.emuCallerNativeSide || "";
        const recycled = Boolean((previousId && previousId !== nextId) || (previousSide && previousSide !== side));
        if (recycled) {
            row.querySelectorAll(".emu-caller-row-tools,.emu-caller-name-pin,.emu-caller-bsp-cell,.emu-caller-clock-cell,.emu-caller-native-level,.emu-caller-native-cd,.emu-caller-native-last,.emu-caller-readable-name,.emu-caller-status-chip").forEach(node => node.remove());
            row.querySelectorAll(".emu-caller-feed-status,.emu-caller-timed-status").forEach(cell => {
                cell.classList.remove("emu-caller-feed-status", "emu-caller-timed-status");
                cell.removeAttribute("data-emu-caller-status");
                cell.removeAttribute("data-emu-caller-status-kind");
            });
            row.querySelectorAll(".emu-caller-native-member-host,.emu-caller-compact-member").forEach(node => node.classList.remove("emu-caller-native-member-host", "emu-caller-compact-member"));
            row.querySelectorAll(".emu-caller-pin-host").forEach(node => node.classList.remove("emu-caller-pin-host"));
            row.querySelectorAll(".emu-caller-native-attack-link").forEach(node => node.classList.remove("emu-caller-native-attack-link"));
            row.classList.remove("emu-caller-row-enhanced", "emu-caller-called-row", "emu-caller-own-called-row", "emu-caller-other-called-row", "emu-caller-pinned-row", "emu-caller-random-pick");
        }
        row.dataset.emuCallerNativePlayerId = nextId;
        const revision = String(state.targetMetaRevision);
        const missingBase = !row.querySelector(":scope > .emu-caller-bsp-cell");
        const missingOwnTelemetry = side === "own" && !row.querySelector(":scope > .emu-caller-native-cd");
        const missingCall = Boolean(side === "enemy" && target && !row.querySelector(`.emu-caller-row-tools[data-emu-caller-target="${nextId}"]`));
        const needsEnhancement = recycled || !previousId || row.dataset.emuCallerMetaRevision !== revision || missingBase || missingOwnTelemetry || missingCall;
        row.dataset.emuCallerMetaRevision = revision;
        return needsEnhancement;
    }

    function disableNativeSortHeaders(header) {
        header.querySelectorAll("[data-emu-caller-cat-sort]").forEach(cell => {
            cell.removeAttribute("data-emu-caller-cat-sort");
            cell.removeAttribute("data-emu-caller-cat-side");
            cell.classList.remove("emu-caller-native-sort");
            cell.removeAttribute("title");
        });
        header.querySelectorAll(".emu-caller-native-sort-indicator").forEach(node => node.remove());
    }

    function nativeWarListSide(list, rows, targetByRow) {
        const container = list.closest(".enemy-faction,.your-faction,[class*='enemy-faction'],[class*='your-faction']");
        if (container?.classList.contains("your-faction") || String(container?.className || "").includes("your-faction")) return "own";
        if (container?.classList.contains("enemy-faction") || String(container?.className || "").includes("enemy-faction")) return "enemy";
        if (rows.some(row => row.classList.contains("your") || Array.from(row.classList).some(name => name.startsWith("your___")))) return "own";
        if (rows.some(row => targetByRow.has(row) || row.classList.contains("enemy") || Array.from(row.classList).some(name => name.startsWith("enemy___")))) return "enemy";
        const nativeList = list.matches?.(".members-list") ? list : list.querySelector?.(".members-list");
        const warLists = Array.from(list.closest?.(".faction-war")?.querySelectorAll?.(".members-list") || []);
        const listIndex = nativeList ? warLists.indexOf(nativeList) : -1;
        if (warLists.length > 1 && listIndex >= 0) return listIndex === 0 ? "enemy" : "own";
        const savedSide = nativeList?.getAttribute("data-emu-caller-native-side") || list.getAttribute?.("data-emu-caller-native-side");
        if (savedSide === "enemy" || savedSide === "own") return savedSide;
        const nativeAttack = Array.from(list.querySelectorAll("a[href*='sid=attack'],a[href*='getInAttack'],a[href*='attack.php']"))
            .some(link => !link.classList.contains("emu-caller-native-attack-link") && !link.closest("[data-emu-caller-native='true'],.emu-caller-row-tools"));
        return nativeAttack ? "enemy" : "own";
    }

    function nativeWarRowSide(row, listSide, target) {
        if (row.classList.contains("your") || Array.from(row.classList).some(name => name.startsWith("your___"))) return "own";
        if (row.classList.contains("enemy") || Array.from(row.classList).some(name => name.startsWith("enemy___")) || target) return "enemy";
        return listSide;
    }

    function factionSideFromControl(control, warRoot) {
        if (!(control instanceof Element) || !(warRoot instanceof Element)) return "";
        const text = cleanWarTableText(control.textContent || "").toLowerCase();
        const ownName = cleanWarTableText(state.faction?.name || "").toLowerCase();
        const factionId = Number(control.getAttribute("data-faction-id") || control.closest("[data-faction-id]")?.getAttribute("data-faction-id"));
        if (factionId && Number(state.faction?.id) === factionId) return "own";
        if (factionId && Number(state.faction?.id) !== factionId) return "enemy";
        if (ownName && text.includes(ownName)) return "own";
        const enemyName = cleanWarTableText(warPanelName(warRoot, "enemy")).toLowerCase();
        if (enemyName && enemyName !== "enemy faction" && text.includes(enemyName)) return "enemy";
        const siblingTexts = Array.from(control.parentElement?.children || []).map(node => cleanWarTableText(node.textContent || "").toLowerCase());
        if (text && ownName && siblingTexts.some(value => value.includes(ownName)) && !text.includes(ownName)) return "enemy";
        if (text && !/^(?:faction|members|level|bsp|score|status|attack|l\.act)$/i.test(text) && /\d/.test(text)) return "enemy";
        return "";
    }

    function toggleCatSort(side, key) {
        if (side !== "enemy" && side !== "own") return;
        if (!["activity", "bsp", "clock", "score", "status"].includes(key)) return;
        if (key === "clock") {
            state.catSort[side] = state.catSort[side]?.key === "clock"
                ? { key: "", direction: "" }
                : { key: "clock", direction: "asc" };
            return;
        }
        if (key === "activity") {
            state.catSort[side] = state.catSort[side]?.key === "activity"
                ? { key: "", direction: "" }
                : { key: "activity", direction: "asc" };
            return;
        }
        const firstDirection = key === "bsp" || key === "score" ? "desc" : "asc";
        const sort = state.catSort[side] || { key: "", direction: "" };
        if (sort.key !== key) state.catSort[side] = { key, direction: firstDirection };
        else if (sort.direction === firstDirection) sort.direction = firstDirection === "asc" ? "desc" : "asc";
        else state.catSort[side] = { key: "", direction: "" };
    }

    function sortCatMembers(members, side) {
        const sort = state.catSort[side] || { key: "", direction: "" };
        const key = sort.key;
        if (!key) return Array.from(members || []);
        const direction = sort.direction === "desc" ? -1 : 1;
        return Array.from(members || []).sort((a, b) => {
            const priorityDifference = warMemberPriority(a, side, key) - warMemberPriority(b, side, key);
            if (priorityDifference) return priorityDifference;
            const left = catSortValue(a, key);
            const right = catSortValue(b, key);
            const leftMissing = left === null || left === "" || !Number.isFinite(left) && typeof left === "number";
            const rightMissing = right === null || right === "" || !Number.isFinite(right) && typeof right === "number";
            if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
            if (leftMissing) return 0;
            if (typeof left === "string" || typeof right === "string") return String(left).localeCompare(String(right), undefined, { sensitivity: "base" }) * direction;
            return (left - right) * direction;
        });
    }

    function warMemberPriority(member, side = "enemy", sortKey = "") {
        const id = Number(member?.id || 0);
        if (id && state.pinnedTargets.has(id)) return 0;
        if (side === "enemy" && id && state.calls.has(id)) {
            const timing = sortKey === "clock" ? clockTimingForMember(member) : null;
            if (!timing || timing.kind !== "hospital") return 1;
        }
        return 2;
    }

    function clockTimingForMember(member) {
        const id = Number(member?.id || 0);
        const target = member?.target || state.targetRows.get(id) || null;
        return targetTiming({
            ...(target || {}),
            id,
            row: member?.row || target?.row || null,
            status: operationalWarStatus(id, member?.row || target?.row || null, target)
        });
    }

    function catSortValue(member, key) {
        const { row, profile, id, target } = member;
        const meta = state.targetMeta.get(Number(id)) || {};
        if (key === "activity") return activitySortRank(activityStateForMember(meta, row));
        if (key === "bsp") return parseFormattedMagnitude(bspValueForId(id, row));
        if (key === "clock") {
            const timing = clockTimingForMember(member);
            if (timing.kind === "okay") {
                const medOutScore = recentMedOutSortScore(id);
                if (medOutScore !== null) return medOutScore;
            }
            return rowScore({ ...(target || {}), id: Number(id), row, status: operationalWarStatus(id, row, target) });
        }
        if (key === "score") return parseFormattedMagnitude(nativeWarCellText(row, ["points", "score"]) || meta.score);
        if (key === "status") return statusSortRank(operationalWarStatus(id, row, target));
        return null;
    }

    function activitySortRank(activity) {
        if (activity === "online") return 0;
        if (activity === "idle") return 1;
        if (activity === "offline") return 2;
        return 3;
    }

    function parseFormattedMagnitude(value) {
        const text = cleanWarTableText(value).replace(/[,$]/g, "").toLowerCase();
        const match = text.match(/(?:over|under)?\s*[<>~]?\s*([+-]?\d+(?:\.\d+)?)\s*([kmbtq])?/);
        if (!match) return null;
        const multipliers = { k: 1e3, m: 1e6, b: 1e9, t: 1e12, q: 1e15 };
        return Number(match[1]) * (multipliers[match[2]] || 1);
    }

    function statusSortRank(status) {
        if (/^okay$/i.test(status)) return 0;
        if (/hosp/i.test(status)) return 1;
        if (/travel/i.test(status)) return 2;
        if (/abroad/i.test(status)) return 3;
        if (/federal/i.test(status)) return 4;
        if (/fallen/i.test(status)) return 5;
        return 6;
    }

    function lastActionAge(value) {
        const text = cleanWarTableText(compactLastAction(value)).toLowerCase();
        if (text === "now") return 0;
        const match = text.match(/^(\d+(?:\.\d+)?)(s|m|h|d|w|mo|y)$/);
        if (!match) return null;
        const seconds = { s: 1, m: 60, h: 3600, d: 86400, w: 604800, mo: 2592000, y: 31536000 };
        return Number(match[1]) * seconds[match[2]];
    }

    function configureNativeSortHeaders(header, side) {
        const definitions = [
            ["activity", ["member", "members"]],
            ["bsp", ["bsp"]],
            ["score", ["points", "score"]],
            ["status", ["status"]]
        ];
        definitions.forEach(([key, names]) => {
            const cell = nativeHeaderCell(header, names);
            if (!cell) return;
            cell.classList.add("emu-caller-native-sort");
            cell.setAttribute("data-emu-caller-cat-side", side);
            cell.setAttribute("data-emu-caller-cat-sort", key);
            cell.title = key === "activity"
                ? `Show active ${side} faction members first`
                : `Sort ${side} faction by ${key}`;
            let indicator = Array.from(cell.children).find(node => node.classList?.contains("emu-caller-native-sort-indicator"));
            if (!indicator) {
                indicator = document.createElement("i");
                indicator.className = "emu-caller-native-sort-indicator";
                indicator.setAttribute("data-emu-caller-native", "true");
                cell.appendChild(indicator);
            }
            const sort = state.catSort[side] || { key: "", direction: "" };
            const nextIndicator = sort.key === key ? (sort.direction === "asc" ? "\u2191" : "\u2193") : "";
            if (indicator.textContent !== nextIndicator) indicator.textContent = nextIndicator;
        });
        const clockButton = header.querySelector(".emu-caller-clock-sort");
        if (clockButton instanceof HTMLButtonElement) {
            const active = state.catSort[side]?.key === "clock";
            clockButton.classList.add("emu-caller-native-sort");
            clockButton.classList.toggle("active", active);
            clockButton.setAttribute("data-emu-caller-cat-side", side);
            clockButton.setAttribute("data-emu-caller-cat-sort", "clock");
            clockButton.setAttribute("aria-pressed", active ? "true" : "false");
        }
    }

    function nativeHeaderCell(header, names) {
        const wanted = names.map(name => name.toLowerCase());
        return Array.from(header.children).find(cell => {
            if (!(cell instanceof HTMLElement)) return false;
            const classes = Array.from(cell.classList).join(" ").toLowerCase();
            const text = cleanWarTableText(cell.childNodes[0]?.textContent || cell.textContent || "").toLowerCase();
            return wanted.some(name => classes.includes(name.replace(/\s+/g, "")) || text === name || text.startsWith(`${name} `));
        }) || null;
    }

    function applyNativeWarSort(members, side) {
        const rows = Array.from(members || []).filter(member => member?.row instanceof HTMLElement);
        if (!rows.length) return;
        const parents = new Set(rows.map(member => member.row.parentElement).filter(Boolean));
        const sort = state.catSort[side] || { key: "", direction: "" };
        const autoSort = side === "enemy" && getBool(STORAGE.autoSort, true);
        const hasPriorityRows = rows.some(member =>
            state.pinnedTargets.has(Number(member.id))
            || (autoSort && state.calls.has(Number(member.id)))
        );
        if (!sort.key && !hasPriorityRows) {
            parents.forEach(parent => parent.removeAttribute("data-emu-caller-sort-active"));
            rows.forEach(member => member.row.style.removeProperty("order"));
            return;
        }
        parents.forEach(parent => parent.setAttribute("data-emu-caller-sort-active", "true"));
        const ordered = sort.key
            ? sortCatMembers(rows, side)
            : rows.map((member, index) => ({ member, index }))
                .sort((left, right) =>
                    warMemberPriority(left.member, autoSort ? side : "own")
                    - warMemberPriority(right.member, autoSort ? side : "own")
                    || left.index - right.index
                )
                .map(item => item.member);
        ordered.forEach((member, index) => {
            member.row.style.setProperty("order", String(index), "important");
        });
    }

    function ensureNativeMemberIndicator(row, profile, id) {
        const level = cleanLevelValue(extractRowLevel(row) || nativeWarCellText(row, ["level", "lvl"]));
        const host = row.querySelector(":scope > .member") || directRowChild(profile, row);
        if (!(host instanceof HTMLElement)) return;
        host.classList.add("emu-caller-native-member-host", "emu-caller-compact-member");
        let readableName = host.querySelector(":scope > .emu-caller-readable-name");
        if (!readableName) {
            readableName = document.createElement("a");
            readableName.className = "emu-caller-readable-name";
            readableName.setAttribute("data-emu-caller-native", "true");
            readableName.target = "_blank";
            readableName.rel = "noopener noreferrer";
            host.appendChild(readableName);
        }
        const meta = warStatusMetaFor(id, state.targetMeta.get(Number(id)) || {});
        const target = state.targetRows.get(Number(id)) || null;
        const displayName = warMemberName(meta, target, profile, id);
        if (readableName.textContent !== displayName) readableName.textContent = displayName;
        if (profile?.href) readableName.href = profile.href;
        else readableName.removeAttribute("href");
        const activity = activityStateForMember(meta, row);
        readableName.dataset.emuCallerActivity = activity;
        readableName.title = `Torn activity: ${activity === "online" ? "Online" : activity === "idle" ? "Idle" : "Offline"}`;
        let indicator = host.querySelector(":scope > .emu-caller-native-level");
        if (!indicator) {
            indicator = document.createElement("small");
            indicator.className = "emu-caller-native-level";
            indicator.setAttribute("data-emu-caller-native", "true");
            host.appendChild(indicator);
        }
        const revive = reviveStateForMember(meta, row);
        const reviveMarkup = typeof revive === "boolean"
            ? ` <span class="emu-caller-native-revive ${revive ? "on" : "off"}" role="img" aria-label="Revives ${revive ? "enabled" : "disabled"}" title="Revives ${revive ? "enabled" : "disabled"}"></span>`
            : "";
        const markup = `Lvl ${escapeHtml(level || "--")}${reviveMarkup}`;
        if (indicator.innerHTML !== markup) indicator.innerHTML = markup;
    }

    function timedWarStatus(meta = {}) {
        const now = Date.now() / 1000;
        const hospitalUntil = Number(meta.hospitalUntil || 0);
        if (hospitalUntil > now) {
            const remaining = formatWarStatusRemaining(hospitalUntil - now);
            const compactRemaining = formatCompactWarStatusRemaining(hospitalUntil - now);
            const overseasRoute = overseasRouteForMeta(meta);
            if (overseasRoute) {
                const country = compactStatusText(overseasRoute.country.label || "", 8);
                const place = compactStatusText(overseasRoute.country.place || country, 40);
                return {
                    kind: "hospital",
                    appearance: "hospital-abroad",
                    label: `${country} H ${compactRemaining}`,
                    title: `Hospital in ${place} for ${remaining}`
                };
            }
            return { kind: "hospital", label: `Hosp ${compactRemaining}`, title: `Hospital in Torn for ${remaining}` };
        }
        const travelUntil = Number(meta.travelUntil || 0);
        if (travelUntil > now) {
            const remaining = formatWarStatusRemaining(travelUntil - now);
            const compactRemaining = formatCompactWarStatusRemaining(travelUntil - now);
            const route = travelRouteForMeta(meta);
            const country = compactStatusText(route?.country?.label || "", 8);
            const destinationCode = route?.kind === "return" ? "TORN" : country;
            const destination = compactStatusText(meta.travelLabel || "", 40)
                .replace(/\s+ETA\b.*$/i, "")
                .replace(/^Travel(?:ing|ling)?$/i, "")
                .trim();
            return {
                kind: "travel",
                label: destinationCode ? `${destinationCode} ${compactRemaining}` : `ETA ${compactRemaining}`,
                title: `${destination ? `${destination} - ` : ""}Travel ETA ${remaining}`
            };
        }
        return null;
    }

    function formatWarStatusRemaining(seconds) {
        seconds = Math.max(0, Math.floor(Number(seconds) || 0));
        if (seconds < 60) return `${seconds}s`;
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days) return `${days}d ${hours}h`;
        if (hours) return `${hours}h ${minutes}m`;
        return `${minutes}m ${seconds % 60}s`;
    }

    function formatCompactWarStatusRemaining(seconds) {
        seconds = Math.max(0, Math.floor(Number(seconds) || 0));
        if (seconds < 60) return `${seconds}s`;
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainder = seconds % 60;
        if (days) return `${days}d${hours}h`;
        if (hours) return `${hours}h${String(minutes).padStart(2, "0")}m`;
        return `${minutes}:${String(remainder).padStart(2, "0")}`;
    }

    function ensureNativeStatusTimer(row, id, target) {
        if (!(row instanceof HTMLElement)) return;
        const statusNode = row.querySelector(":scope > [class*='status___'],:scope > .status") || row.querySelector("[class*='status___'],.status");
        const statusCell = directRowChild(statusNode, row);
        if (!(statusCell instanceof HTMLElement)) return;
        const meta = warStatusMetaFor(id, target?.meta || state.targetMeta.get(Number(id)) || {});
        const nativeStatus = nativeWarStatusText(statusCell);
        const nativeStatusClass = warStatusClass(nativeStatus);
        const explicitHospitalUntil = Number(meta.hospitalUntil || 0);
        const explicitHospitalExpired = explicitHospitalUntil > 0 && explicitHospitalUntil <= Date.now() / 1000;
        const nativeHospitalSeconds = nativeStatusClass === "is-hospital" ? parseDurationFromText(nativeStatus) : 0;
        if (explicitHospitalUntil > Date.now() / 1000) scheduleHospitalReleaseEdge(id, explicitHospitalUntil);
        const nativeLive = ["is-okay", "is-hospital", "is-travel", "is-jail"].includes(nativeStatusClass);
        const feedTimed = timedWarStatus(meta);
        const timed = !nativeLive
            ? feedTimed
            : nativeStatusClass === "is-hospital" && feedTimed?.kind === "hospital"
                ? feedTimed
                : nativeStatusClass === "is-travel" && feedTimed?.kind === "travel"
                    ? feedTimed
                    : null;
        const feedStatus = explicitHospitalExpired && nativeStatusClass === "is-hospital" && !nativeHospitalSeconds
            ? "Okay"
            : nativeLive
                ? normalizeOperationalStatus(nativeStatus, nativeStatusClass === "is-travel" ? meta : {})
                : normalizeOperationalStatus(meta.status || meta.travelLabel || nativeStatus, meta);
        const display = timed?.label || feedStatus;
        const statusClass = warStatusClass(display || "");
        const kind = timed?.kind || (statusClass === "is-hospital" ? "hospital" : statusClass === "is-travel" ? "travel" : statusClass === "is-jail" ? "jail" : statusClass === "is-okay" ? "okay" : "other");
        const observedHospitalUntil = kind === "hospital"
            ? Number(meta.hospitalUntil || 0) || Math.floor(Date.now() / 1000) + parseDurationFromText(nativeStatus)
            : 0;
        trackHospitalExit(id, kind, observedHospitalUntil);
        let chip = statusCell.querySelector(":scope > .emu-caller-status-chip");
        statusCell.classList.toggle("emu-caller-feed-status", Boolean(display));
        statusCell.classList.toggle("emu-caller-timed-status", Boolean(timed));
        if (!display) {
            chip?.remove();
            statusCell.removeAttribute("data-emu-caller-status");
            statusCell.removeAttribute("data-emu-caller-status-kind");
            if (statusCell.hasAttribute("data-emu-caller-original-title")) {
                const originalTitle = statusCell.getAttribute("data-emu-caller-original-title") || "";
                if (originalTitle) statusCell.title = originalTitle;
                else statusCell.removeAttribute("title");
                statusCell.removeAttribute("data-emu-caller-original-title");
            }
            return;
        }
        if (!chip) {
            chip = document.createElement("span");
            chip.className = "emu-caller-status-chip";
            chip.setAttribute("data-emu-caller-native", "true");
            chip.style.background = nativeStatusBackground(statusCell, row);
            statusCell.appendChild(chip);
        }
        if (chip.textContent !== display) chip.textContent = display;
        chip.setAttribute("data-kind", timed?.appearance || kind);
        chip.title = timed?.title || display;
        if (!statusCell.hasAttribute("data-emu-caller-original-title")) {
            statusCell.setAttribute("data-emu-caller-original-title", statusCell.getAttribute("title") || "");
        }
        statusCell.setAttribute("data-emu-caller-status", display);
        statusCell.setAttribute("data-emu-caller-status-kind", kind);
        statusCell.title = timed?.title || display;
    }

    function nativeWarStatusText(statusCell) {
        if (!(statusCell instanceof HTMLElement)) return "";
        const clone = statusCell.cloneNode(true);
        clone.querySelectorAll("[data-emu-caller-native='true'],.emu-caller-status-chip").forEach(node => node.remove());
        return compactText(clone.textContent || "");
    }

    function nativeStatusBackground(statusCell, row) {
        let node = statusCell;
        for (let depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
            const color = window.getComputedStyle(node).backgroundColor;
            if (color && color !== "transparent" && !/^rgba\([^)]*,\s*0\)$/.test(color)) {
                return color;
            }
            if (node === row) break;
        }
        return "rgba(48,48,48,.98)";
    }

    function refreshMountedStatusTimers() {
        if (document.hidden) return;
        document.querySelectorAll("[data-emu-caller-native-row='true'][data-emu-caller-native-player-id]").forEach(row => {
            const id = Number(row.getAttribute("data-emu-caller-native-player-id") || 0);
            if (!id) return;
            ensureNativeStatusTimer(row, id, state.targetRows.get(id) || null);
            if (row.getAttribute("data-emu-caller-native-side") === "own") ensureNativeCooldownCell(row, id);
        });
        refreshActiveClockSort();
    }

    function scheduleHospitalReleaseEdge(targetId, hospitalUntil) {
        targetId = Number(targetId);
        hospitalUntil = Number(hospitalUntil);
        if (!targetId || !hospitalUntil) return;
        const existing = state.hospitalReleaseEdges.get(targetId);
        if (existing?.hospitalUntil === hospitalUntil) return;
        if (existing?.timer) window.clearTimeout(existing.timer);
        const delay = hospitalUntil * 1000 - Date.now() + 40;
        if (delay < -5000 || delay > 24 * 60 * 60 * 1000) return;
        const timer = window.setTimeout(() => {
            state.hospitalReleaseEdges.set(targetId, { hospitalUntil, timer: 0, fired: true });
            const target = state.targetRows.get(targetId) || null;
            if (target?.row?.isConnected) {
                ensureNativeStatusTimer(target.row, targetId, target);
                refreshMountedCallControl(targetId);
                refreshActiveClockSort();
                // The row changes immediately from the known Torn release timestamp.
                // Confirm that edge in the background without delaying Torn's native attack link.
                void refreshTargetWarStatus(target).then(() => {
                    if (target.row?.isConnected) ensureNativeStatusTimer(target.row, targetId, target);
                    refreshMountedCallControl(targetId);
                    refreshActiveClockSort();
                }).catch(() => { });
            }
        }, Math.max(0, delay));
        state.hospitalReleaseEdges.set(targetId, { hospitalUntil, timer, fired: false });
        if (state.hospitalReleaseEdges.size > 300) {
            for (const [id, edge] of state.hospitalReleaseEdges) {
                if (id === targetId || edge?.timer) continue;
                state.hospitalReleaseEdges.delete(id);
                if (state.hospitalReleaseEdges.size <= 250) break;
            }
        }
    }

    function trackHospitalExit(id, kind, hospitalUntil = 0) {
        id = Number(id);
        if (!id) return;
        const wasHospital = state.hospitalStateById.get(id) === true;
        const isHospital = kind === "hospital";
        if (isHospital) {
            const activeCall = state.calls.get(id);
            const callHospitalUntil = Number(activeCall?.hospitalUntil || activeCall?.hospital_until || 0);
            const callWasHospitalPrecall = callHospitalUntil > Date.now() / 1000;
            state.recentMedOutById.delete(id);
            state.hospitalStateById.set(id, true);
            if (activeCall && !callWasHospitalPrecall) {
                void verifyAndReleaseHospitalizedCall(id, hospitalUntil);
            }
        } else if (kind === "okay") {
            if (wasHospital) state.recentMedOutById.set(id, Date.now());
            state.hospitalStateById.set(id, false);
        } else if (kind === "travel" || kind === "jail") {
            state.recentMedOutById.delete(id);
            state.hospitalStateById.set(id, false);
        }
    }

    async function verifyAndReleaseHospitalizedCall(targetId, hospitalUntil = 0) {
        targetId = Number(targetId);
        if (!targetId || state.hospitalVerifyInFlight.has(targetId)) return false;
        if (Date.now() - Number(state.hospitalVerifyLastCheckedAt.get(targetId) || 0) < 2000) return false;
        const target = state.targetRows.get(targetId);
        if (!target?.row?.isConnected) return false;
        state.hospitalVerifyInFlight.add(targetId);
        state.hospitalVerifyLastCheckedAt.set(targetId, Date.now());
        try {
            const meta = await refreshTargetWarStatus(target);
            const timed = timedWarStatus(meta);
            const status = normalizeOperationalStatus(meta.status || meta.travelLabel || "", meta);
            if (timed?.kind !== "hospital" && !/hosp|hospital/i.test(status)) return false;
            const activeCall = state.calls.get(targetId);
            const callHospitalUntil = Number(activeCall?.hospitalUntil || activeCall?.hospital_until || 0);
            if (!activeCall || callHospitalUntil > Date.now() / 1000) return false;
            const confirmedUntil = Number(meta.hospitalUntil || 0) || Number(hospitalUntil || 0);
            if (confirmedUntil <= Date.now() / 1000) return false;
            suppressHospitalizedCall(targetId, activeCall);
            state.calls.delete(targetId);
            refreshMountedCallControl(targetId);
            renderPanel();
            scanSoon(0);
            return await releaseHospitalizedCall(targetId, confirmedUntil, Math.floor(Number(meta._verifiedAt || Date.now()) / 1000));
        } catch (err) {
            return false;
        } finally {
            state.hospitalVerifyInFlight.delete(targetId);
        }
    }

    async function releaseHospitalizedCall(targetId, hospitalUntil = 0, statusObservedAt = 0) {
        targetId = Number(targetId);
        if (!targetId || state.hospitalReleaseInFlight.has(targetId)) return false;
        state.hospitalReleaseInFlight.add(targetId);
        try {
            for (const delay of [0, 450, 1250]) {
                if (delay) await new Promise(resolve => window.setTimeout(resolve, delay));
                try {
                    const data = await apiRequest("/api/emu-caller/uncall", {
                        warId: state.warId || detectWarId(),
                        targetId,
                        hospitalUntil: Number(hospitalUntil || 0),
                        statusObservedAt: Number(statusObservedAt || 0),
                        source: "hospitalized-status-confirmed"
                    }, "POST");
                    applyServerState(data);
                    clearAttackCallContext(targetId);
                    return true;
                } catch (err) {
                    // Retry briefly; the local suppression keeps the completed target out of the claimed queue.
                }
            }
            return false;
        } finally {
            state.hospitalReleaseInFlight.delete(targetId);
        }
    }

    function recentMedOutSortScore(id) {
        id = Number(id);
        const medOutAt = Number(state.recentMedOutById.get(id) || 0);
        if (!medOutAt) return null;
        const age = Date.now() - medOutAt;
        if (age < 0 || age > MED_OUT_PRIORITY_MS) {
            state.recentMedOutById.delete(id);
            return null;
        }
        return -100 + age / MED_OUT_PRIORITY_MS;
    }

    function refreshActiveClockSort() {
        ["enemy", "own"].forEach(side => {
            if (state.catSort[side]?.key !== "clock") return;
            const groups = new Map();
            document.querySelectorAll(`.faction-war [data-emu-caller-native-row='true'][data-emu-caller-native-side='${side}'][data-emu-caller-native-player-id]`).forEach(row => {
                if (!(row instanceof HTMLElement) || !row.parentElement) return;
                const members = groups.get(row.parentElement) || [];
                const id = Number(row.getAttribute("data-emu-caller-native-player-id") || 0);
                if (id > 0) members.push({ row, id, profile: nativeWarProfileLink(row), target: state.targetRows.get(id) || null, side });
                groups.set(row.parentElement, members);
            });
            groups.forEach(members => {
                if (members.length) applyNativeWarSort(members, side);
            });
        });
    }

    function ensureNativeCooldownCell(row, id) {
        const statusNode = row.querySelector(":scope > [class*='status___'],:scope > .status") || row.querySelector("[class*='status___'],.status");
        const statusCell = directRowChild(statusNode, row);
        let cell = row.querySelector(":scope > .emu-caller-native-cd");
        if (!cell) {
            cell = document.createElement("div");
            cell.className = "emu-caller-native-cd left";
            cell.setAttribute("data-emu-caller-native", "true");
            if (statusCell) statusCell.after(cell);
            else row.appendChild(cell);
        }
        const meta = warStatusMetaFor(id, state.targetMeta.get(Number(id)) || {});
        const live = onlineTelemetryFor(id) || {};
        const values = {
            energy: firstTelemetryValue(meta.energy, live.energy, extractEnergyFromRow(row)),
            drug: firstTelemetryValue(currentTelemetryCooldown(meta, "drug"), live.drugCooldown, extractCooldownFromRow(row, "drug")),
            booster: firstTelemetryValue(currentTelemetryCooldown(meta, "booster"), live.boosterCooldown, extractCooldownFromRow(row, "booster")),
            medical: firstTelemetryValue(currentTelemetryCooldown(meta, "medical"), live.medicalCooldown, extractCooldownFromRow(row, "medical"))
        };
        const markup = nativeTelemetryPart("energy", TELEMETRY_ENERGY_ICON, values.energy, "Energy") +
            nativeTelemetryPart("drug", `<img src="${TELEMETRY_DRUG_ICON}" alt="">`, values.drug, "Drug cooldown") +
            nativeTelemetryPart("booster", TELEMETRY_BOOSTER_ICON, values.booster, "Booster cooldown") +
            nativeTelemetryPart("medical", `<img src="${TELEMETRY_MEDICAL_ICON}" alt="">`, values.medical, "Medical cooldown");
        if (cell.innerHTML !== markup) cell.innerHTML = markup;
    }

    function currentTelemetryCooldown(meta, kind) {
        const prefix = kind === "medical" ? "medical" : kind === "booster" ? "booster" : "drug";
        const ready = meta?.[`${prefix}CooldownReady`];
        const until = Number(meta?.[`${prefix}CooldownUntil`] || 0);
        if (ready === true) return "Ready";
        if (until > 0) {
            const remaining = Math.max(0, until - Math.floor(Date.now() / 1000));
            return remaining > 0 ? formatTelemetryCooldown(remaining) : "Ready";
        }
        return meta?.[`${prefix}Cooldown`] || "";
    }

    function formatTelemetryCooldown(seconds) {
        seconds = Math.max(0, Math.floor(Number(seconds) || 0));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours) return `${hours}h ${minutes}m`;
        if (minutes) return `${minutes}m`;
        return `${seconds}s`;
    }

    function firstTelemetryValue(...values) {
        return values.find(value => value !== undefined && value !== null && cleanWarTableText(value) !== "") ?? "";
    }

    function nativeTelemetryPart(kind, icon, value, title) {
        const clean = cleanWarTableText(value === 0 ? "0" : value || "");
        const display = clean ? compactText(clean).slice(0, 8) : "-";
        const ready = /^(?:0|0s|ready|full)$/i.test(clean);
        return `<span class="kind-${kind}${clean ? " has-value" : ""}${ready ? " ready" : ""}" title="${escapeAttr(clean ? `${title}: ${clean}` : `${title}: unavailable`)}"><i>${icon}</i><b>${escapeHtml(display)}</b></span>`;
    }

    function bspValueForId(id, row) {
        const playerId = Number(id);
        if (!Number.isFinite(playerId)) return "";
        const cached = state.bspPredictions.get(playerId) || {};
        return cleanWarTableText(cached.label || cached.actual_total_stats_human || cached.total_stats_human || cached.bs_estimate_human || formatStatEstimate(cached.actual_total_stats || cached.total_stats || cached.bs_estimate));
    }

    function operationalWarStatus(id, row, target) {
        const meta = warStatusMetaFor(id, state.targetMeta.get(Number(id)) || {});
        const timed = timedWarStatus(meta);
        if (timed) return timed.label;
        const candidates = [nativeWarCellText(row, ["status"]), target?.status, statusFromTargetMeta(id), rowStatus(row)];
        for (const value of candidates) {
            const status = normalizeOperationalStatus(value, meta);
            if (status) return status;
        }
        return "Unknown";
    }

    function normalizeOperationalStatus(value, meta = {}) {
        const timed = timedWarStatus(meta);
        if (timed) return timed.label;
        const text = cleanWarTableText(compactStatusText(value || "", 40));
        if (/\b(?:online|offline|idle)\b/i.test(text) && !/\b(?:okay|hospital|hosp|jail|travel|abroad|flying|returning)\b/i.test(text)) return "";
        const time = text.match(/\b\d+(?:\.\d+)?\s*(?:d|h|m|s)\b/i)?.[0] || "";
        if (/\b(?:hospital|hosp)\b/i.test(text)) return time ? `Hosp ${time}` : "Hospital";
        if (/\bjail(?:ed)?\b/i.test(text)) return time ? `Jail ${time}` : "Jail";
        if (/\bfederal\b/i.test(text)) return "Federal";
        if (/\bfallen\b/i.test(text)) return "Fallen";
        const countryStatus = compactTravelCountryStatus(meta, text);
        if (/\babroad\b/i.test(text)) return countryStatus || "Abroad";
        if (/\b(?:traveling|travelling|flying|returning)\b/i.test(text)) return countryStatus || "Traveling";
        if (/\bokay\b/i.test(text)) return "Okay";
        const now = Date.now() / 1000;
        if (meta.hospitalUntil && meta.hospitalUntil > now) return `Hosp ${formatRemainingSeconds(meta.hospitalUntil - now)}`;
        if (meta.travelLabel) return countryStatus || compactStatusText(meta.travelLabel, 40);
        return "";
    }

    function warStatusClass(status) {
        if (/hosp/i.test(status)) return "is-hospital";
        if (/jail/i.test(status)) return "is-jail";
        if (/travel|abroad|flying|returning|\b(?:mx|ci|ca|hi|uk|ar|sw|jp|cn|uae|sa|tc|mexico|canada|china|japan|switzerland|argentina|hawaii)\b/i.test(status)) return "is-travel";
        if (/okay/i.test(status)) return "is-okay";
        return "is-unknown";
    }

    function reviveStateForMember(meta, row) {
        if (typeof meta?.revivable === "boolean") return meta.revivable;
        const marker = row?.querySelector?.("[data-revivable],[data-is-revivable],[class*='reviv'],[class*='Reviv'],[title*='reviv'],[title*='Reviv'],[aria-label*='reviv'],[aria-label*='Reviv']");
        if (!marker) return null;
        const raw = marker.getAttribute("data-revivable") ?? marker.getAttribute("data-is-revivable") ?? marker.getAttribute("title") ?? marker.getAttribute("aria-label") ?? marker.textContent;
        return parseBooleanState(raw);
    }

    function parseBooleanState(value) {
        if (typeof value === "boolean") return value;
        if (value === 1 || value === "1") return true;
        if (value === 0 || value === "0") return false;
        const text = String(value ?? "").trim().toLowerCase();
        if (/^(?:true|yes|on|enabled|available)$/.test(text) || /reviv(?:e|able|es).*?(?:on|enabled|available)/.test(text)) return true;
        if (/^(?:false|no|off|disabled|unavailable)$/.test(text) || /reviv(?:e|able|es).*?(?:off|disabled|unavailable)/.test(text)) return false;
        return null;
    }

    function warPanelName(warRoot, side) {
        if (side === "own") return state.faction?.name || "Your faction";
        const ownName = compactText(state.faction?.name || "").toLowerCase();
        const candidate = Array.from(warRoot.querySelectorAll("h1,h2,h3,h4,h5,[class*='faction-name'],[class*='factionName'],[class*='war-title'],[class*='title']"))
            .filter(node => !node.closest(".emu-caller-cat-board"))
            .map(node => compactText(node.textContent || "").replace(/\s+\d[\d,]*$/, "").trim())
            .find(text => text.length >= 2 && text.length <= 40 && text.toLowerCase() !== ownName && !/ranked war filter|members|score|status|attack|faction war/i.test(text));
        return candidate || "Enemy faction";
    }

    function warRowPlayerId(row, profile) {
        const direct = extractPlayerId(profile?.href || "");
        if (direct) return direct;
        const hints = [row.dataset?.userId, row.dataset?.userid, row.dataset?.xid, row.id, row.querySelector("[id*='-profile-']")?.id];
        for (const hint of hints) {
            const match = String(hint || "").match(/(?:^|\D)(\d{3,10})(?:\D|$)/);
            if (match) return Number(match[1]);
        }
        return 0;
    }

    function nativeWarCellText(row, names) {
        const cell = Array.from(row.children).find(node => node instanceof HTMLElement && !node.classList.contains("emu-caller-cat-row") && names.some(name => node.classList.contains(name) || Array.from(node.classList).some(className => className.toLowerCase().startsWith(`${name}__`))));
        return cleanWarTableText(cell?.textContent || "");
    }

    function warMemberName(meta, target, profile, id) {
        const candidates = [meta?.name, profile?.querySelector("img")?.alt, profile?.getAttribute("aria-label"), profile?.getAttribute("title"), profile?.textContent, target?.name];
        for (const value of candidates) {
            const name = cleanWarTableText(cleanName(value)).replace(/(?:'s)?\s+(?:torn\s+)?profile.*$/i, "").replace(/^view\s+/i, "").trim();
            if (name && !/^(?:profile|attack|unknown)$/i.test(name) && !/^\d+(?:\.\d+)?\s/.test(name)) return name;
        }
        return `Player ${id}`;
    }

    function nativeLastAction(row) {
        const node = row.querySelector(".last-action, .tt-last-action, [data-twse-last-action-timestamp]");
        const timestamp = Number(node?.getAttribute("data-twse-last-action-timestamp"));
        return timestamp > 1000000000 ? timeAgo(timestamp) : compactText(node?.textContent || "");
    }

    function compactLastAction(value) {
        const text = compactText(value || "--").replace(/\s+ago$/i, "");
        if (/online|just now|now/i.test(text)) return "now";
        const match = text.match(/(\d+(?:\.\d+)?)\s*(second|sec|minute|min|hour|hr|day|week|month|year)s?/i);
        if (!match) return text.slice(0, 6) || "--";
        const unit = match[2].toLowerCase();
        const suffix = unit.startsWith("sec") ? "s" : unit.startsWith("min") ? "m" : unit.startsWith("hour") || unit.startsWith("hr") ? "h" : unit.startsWith("day") ? "d" : unit.startsWith("week") ? "w" : unit.startsWith("month") ? "mo" : "y";
        return `${match[1]}${suffix}`;
    }

    function enhanceWarRow(target) {
        if (!target?.row) return;
        target.row.classList.add("emu-caller-row-enhanced");
        mountWarInfo(target);
    }

    function mountWarInfo(target) {
        if (!target?.row) return;
        target.row.querySelectorAll(".emu-caller-row-tools").forEach(node => {
            if (Number(node.dataset.emuCallerTarget || 0) !== Number(target.id)) node.remove();
        });
        if (!mountedWarRowMatchesTarget(target)) {
            clearStaleWarCallMount(target.row);
            return;
        }
        target.row.querySelectorAll(".emu-caller-cat-strip,.emu-caller-row-info").forEach(node => node.remove());
        const layout = ensureWarTableLayout(target);
        if (!layout) return;
        if (target.attackLink) {
            target.attackLink.classList.add("emu-caller-native-attack-link");
            target.attackLink.removeAttribute("target");
            target.attackLink.removeAttribute("rel");
        }
        let tools = layout.attackCell.querySelector(`.emu-caller-row-tools[data-emu-caller-target="${target.id}"]`);
        if (!tools) {
            tools = document.createElement("span");
            tools.className = "emu-caller-row-tools";
            tools.setAttribute("data-emu-caller-native", "true");
            tools.dataset.emuCallerTarget = String(target.id);
            const insertionPoint = target.attackLink?.parentElement === layout.attackCell
                ? target.attackLink
                : layout.attackCell.firstChild;
            layout.attackCell.insertBefore(tools, insertionPoint || null);
        }
        renderCallTool(tools, target);
    }

    function renderCallTool(tools, target) {
        if (!(tools instanceof HTMLElement) || !target?.id) return;
        if (!mountedWarRowMatchesTarget(target)) {
            clearStaleWarCallMount(target.row);
            return;
        }
        const call = state.calls.get(target.id);
        const ownCall = isOwnCall(call);
        const claimedByOther = Boolean(call && !ownCall);
        const callFeedback = buttonFeedback(target.id, "call");
        const callCooling = buttonCoolingDown(target.id, "call");
        const availability = callAvailability(target);
        const ownFactionRow = target.row.getAttribute("data-emu-caller-native-side") === "own";
        const pinned = !ownFactionRow && state.pinnedTargets.has(Number(target.id));
        const callLabel = callFeedback || (ownCall ? "UNCALL" : call ? "CLAIMED" : availability.allowed ? "CALL" : "WAIT");
        const callDisabled = callCooling || claimedByOther || (!call && !availability.allowed);
        ensureWarNamePin(target, pinned);
        const signature = [target.id, callLabel, Boolean(call), claimedByOther, callCooling, callDisabled].join("|");
        let callButton = tools.querySelector(`[data-emu-caller-call="${target.id}"]`);
        if (tools.dataset.emuCallerSignature !== signature) {
            tools.innerHTML = `<button type="button" class="emu-caller-call-button${call ? " called" : ""}${ownCall ? " own" : ""}${claimedByOther ? " claimed" : ""}" data-emu-caller-call="${target.id}" ${callDisabled ? "disabled" : ""}>${escapeHtml(callLabel)}</button>`;
            tools.dataset.emuCallerSignature = signature;
            callButton = tools.querySelector(`[data-emu-caller-call="${target.id}"]`);
            if (callButton) callButton.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                if (!mountedWarRowMatchesTarget(target)) {
                    clearStaleWarCallMount(target.row);
                    scanSoon(0);
                    return;
                }
                if (ownCall) uncallTarget(target.id, "call");
                else if (!call) callTarget(target, "call");
            };
        }
        if (callButton) {
            const expiresAt = callExpiresAt(call);
            const expiry = expiresAt ? ` until ${new Date(expiresAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "";
            const description = ownCall
                ? `Your call${expiry}. Click to remove it.`
                : call
                    ? `Claimed by ${call.callerName || "Unknown"}${expiry}`
                    : availability.reason;
            callButton.setAttribute("aria-label", description);
            if (window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches) callButton.title = description;
            else callButton.removeAttribute("title");
        }
        target.row.classList.toggle("emu-caller-pinned-row", pinned);
        target.row.classList.toggle("emu-caller-own-called-row", ownCall);
        target.row.classList.toggle("emu-caller-other-called-row", claimedByOther);
    }

    function ensureWarNamePin(target, pinned) {
        if (!target?.row || !target?.id) return;
        if (target.row.getAttribute("data-emu-caller-native-side") === "own") {
            target.row.querySelectorAll(".emu-caller-name-pin").forEach(button => button.remove());
            target.row.querySelectorAll(".emu-caller-pin-host").forEach(node => node.classList.remove("emu-caller-pin-host"));
            return;
        }
        const memberCell = target.row.querySelector(":scope > .member") || directRowChild(target.profileLink, target.row);
        if (!(memberCell instanceof HTMLElement)) return;
        const bannerSelector = ".honor-text-wrap,[class*='honorWrap'],[class*='honor-wrap'],[class*='honorText'],[class*='honor-text']";
        const profileLink = target.profileLink instanceof HTMLElement && memberCell.contains(target.profileLink)
            ? target.profileLink
            : null;
        const bannerHost = memberCell.matches(bannerSelector)
            ? memberCell
            : memberCell.querySelector(bannerSelector) || profileLink;
        const pinHost = memberCell.classList.contains("emu-caller-compact-member")
            ? memberCell
            : bannerHost instanceof HTMLElement ? bannerHost : memberCell;
        target.row.querySelectorAll(".emu-caller-name-pin").forEach(button => {
            if (button.parentElement !== pinHost || button.dataset.emuCallerPin !== String(target.id)) button.remove();
        });
        memberCell.querySelectorAll(".emu-caller-pin-host").forEach(node => {
            if (node !== pinHost) node.classList.remove("emu-caller-pin-host");
        });
        memberCell.classList.toggle("emu-caller-pin-host", pinHost === memberCell);
        pinHost.classList.add("emu-caller-pin-host");
        let pinButton = pinHost.querySelector(`:scope > .emu-caller-name-pin[data-emu-caller-pin="${target.id}"]`);
        if (!pinButton) {
            pinButton = document.createElement("button");
            pinButton.type = "button";
            pinButton.className = "emu-caller-pin-button emu-caller-name-pin";
            pinButton.setAttribute("data-emu-caller-native", "true");
            pinButton.dataset.emuCallerPin = String(target.id);
            pinHost.appendChild(pinButton);
        }
        pinButton.dataset.emuCallerPinAnchor = pinHost === memberCell ? "member" : "banner";
        pinButton.classList.toggle("active", pinned);
        pinButton.setAttribute("aria-pressed", pinned ? "true" : "false");
        pinButton.setAttribute("aria-label", pinned ? "Unpin target" : "Pin target");
        pinButton.textContent = pinned ? "\u2605" : "\u2606";
        pinButton.removeAttribute("title");
        pinButton.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            togglePinnedTarget(target.id);
        };
    }

    function togglePinnedTarget(targetId) {
        targetId = Number(targetId);
        if (!targetId) return;
        if (state.pinnedTargets.has(targetId)) state.pinnedTargets.delete(targetId);
        else state.pinnedTargets.add(targetId);
        setValue(STORAGE.pinnedTargets, JSON.stringify(Array.from(state.pinnedTargets).slice(0, 100)));
        refreshMountedCallControls();
        scanSoon(0);
    }

    function refreshMountedCallControl(targetId) {
        targetId = Number(targetId);
        const target = state.targetRows.get(targetId);
        if (!target?.row?.isConnected) {
            state.targetRows.delete(targetId);
            return;
        }
        if (!mountedWarRowMatchesTarget(target)) {
            clearStaleWarCallMount(target.row);
            state.targetRows.delete(targetId);
            scanSoon(0);
            return;
        }
        const tools = target.row.querySelector(`.emu-caller-row-tools[data-emu-caller-target="${targetId}"]`);
        if (tools) renderCallTool(tools, target);
        const call = state.calls.get(targetId);
        target.row.classList.toggle("emu-caller-called-row", Boolean(call));
        target.row.classList.toggle("emu-caller-own-called-row", isOwnCall(call));
        target.row.classList.toggle("emu-caller-other-called-row", Boolean(call) && !isOwnCall(call));
        target.row.classList.toggle("emu-caller-pinned-row", state.pinnedTargets.has(targetId));
    }

    function refreshMountedCallControls() {
        Array.from(state.targetRows.keys()).forEach(refreshMountedCallControl);
    }

    function directRowChild(node, row) {
        let current = node instanceof HTMLElement ? node : node?.parentElement;
        while (current && current.parentElement !== row) current = current.parentElement;
        return current?.parentElement === row ? current : null;
    }

    async function refreshEmuBspStats(rows, force) {
        if (state.sleeping || enterFinishedWarSleep()) return;
        const ids = Array.from(new Set((rows || [])
            .map(item => Number(item?.id))
            .filter(Number.isFinite)))
            .slice(0, 200);
        if (!ids.length) return;
        if (state.bspPending) {
            ids.forEach(id => state.bspQueuedIds.add(id));
            state.bspQueuedForce = state.bspQueuedForce || Boolean(force);
            return;
        }
        paintMountedBspCells();
        if (!getApiKey()) return;
        const rosterKey = ids.join(",");
        const now = Date.now();
        const requestIds = force ? ids : ids.filter(id => {
            const cached = state.bspPredictions.get(id);
            const ttl = cached?.missing ? BSP_MISSING_RETRY_MS : BSP_CACHE_TTL_MS;
            return !cached || Number(cached.cachedAt || 0) <= now - ttl;
        });
        if (!requestIds.length) {
            state.bspRosterKey = rosterKey;
            state.bspLastFetch = now;
            return;
        }
        state.bspPending = true;
        try {
            const next = new Map(state.bspPredictions);
            let responseReceived = false;
            requestIds.forEach(id => next.set(id, { missing: true, cachedAt: now }));
            for (let index = 0; index < requestIds.length; index += BSP_FAST_CACHE_BATCH_SIZE) {
                const batch = requestIds.slice(index, index + BSP_FAST_CACHE_BATCH_SIZE);
                try {
                    const cachedResult = await apiRequest(`/api/emubsp/predictions?players=${encodeURIComponent(batch.join(","))}&source=ffscouter&cached_only=1`);
                    if (state.sleeping) return;
                    responseReceived = true;
                    mergeBspPredictions(next, cachedResult, now);
                } catch (err) {
                    // Continue with the normal lookup when the fast cache endpoint is unavailable.
                }
                state.bspPredictions = new Map(next);
                saveBspCache();
                paintMountedBspCells();
            }
            const liveRequestIds = requestIds.filter(id => next.get(id)?.missing);
            for (let index = 0; index < liveRequestIds.length; index += BSP_BATCH_SIZE) {
                const batch = liveRequestIds.slice(index, index + BSP_BATCH_SIZE);
                const result = await apiRequest(`/api/emubsp/predictions?players=${encodeURIComponent(batch.join(","))}&source=ffscouter`);
                if (state.sleeping) return;
                responseReceived = true;
                mergeBspPredictions(next, result, now);
                state.bspPredictions = new Map(next);
                saveBspCache();
                paintMountedBspCells();
            }
            state.bspPredictions = next;
            state.bspRosterKey = rosterKey;
            state.bspLastFetch = now;
            if (responseReceived) state.bspError = "";
        } catch (err) {
            requestIds.forEach(id => {
                const current = state.bspPredictions.get(id);
                if (!current || current.missing) state.bspPredictions.set(id, { missing: true, cachedAt: Date.now() });
            });
            state.bspRosterKey = rosterKey;
            state.bspLastFetch = Date.now();
            state.bspError = `BSP waiting: ${friendlyError(err)}`;
            renderPanel();
        } finally {
            state.bspPending = false;
            const queuedIds = Array.from(state.bspQueuedIds);
            const queuedForce = state.bspQueuedForce;
            state.bspQueuedIds.clear();
            state.bspQueuedForce = false;
            if (queuedIds.length) queueMicrotask(() => refreshEmuBspStats(queuedIds.map(id => ({ id, row: null })), queuedForce).catch(() => { }));
            if (isHallOfFameBspPage()) scanSoon(0);
            if (state.catSort.enemy?.key === "bsp" || state.catSort.own?.key === "bsp") scanSoon(0);
        }
    }

    function mergeBspPredictions(target, result, cachedAt) {
        const predictions = result?.predictions && typeof result.predictions === "object" ? result.predictions : {};
        Object.entries(predictions).forEach(([key, item]) => {
            const playerId = Number(key);
            if (!Number.isFinite(playerId) || !item || typeof item !== "object") return;
            const label = cleanWarTableText(item.actual_total_stats_human || item.total_stats_human || item.bs_estimate_human || formatStatEstimate(item.actual_total_stats || item.total_stats || item.bs_estimate));
            if (label) target.set(playerId, { ...item, provider: "ffscouter", missing: false, label, cachedAt });
        });
    }

    function paintMountedBspCells() {
        document.querySelectorAll("[data-emu-caller-native-row='true']").forEach(row => ensureWarBspCell(row));
        paintForeignWarBspBadges();
        document.querySelectorAll("[data-emu-caller-faction-bsp-row]").forEach(row => {
            ensureStandardFactionBspCell(row, Number(row.dataset.emuCallerFactionBspRow || 0));
        });
        applyStandardFactionBspSort();
        document.querySelectorAll("[data-emu-caller-company-card-row]").forEach(card => {
            ensureCompanyCardBsp(card, Number(card.dataset.emuCallerCompanyCardRow || 0));
        });
        document.querySelectorAll("[data-emu-caller-hall-of-fame-bsp-host]").forEach(mount => {
            const playerId = Number(mount.dataset.emuCallerHallOfFameBspHost || 0);
            const profile = mount.querySelector("a[href]") || mount;
            if (playerId) ensureHallOfFameBspBadge(mount, profile, playerId);
        });
        document.querySelectorAll("[data-emu-caller-advanced-search-bsp-host]").forEach(host => {
            const playerId = Number(host.dataset.emuCallerAdvancedSearchBspHost || 0);
            if (playerId) ensureAdvancedSearchBspTag(host, playerId);
        });
        document.querySelectorAll("[data-emu-caller-target-list-bsp-host]").forEach(host => {
            const playerId = Number(host.dataset.emuCallerTargetListBspHost || 0);
            const row = host.closest("[data-emu-caller-target-list-bsp-row]");
            if (playerId && row instanceof HTMLElement) ensureTargetsListBspTag(host, playerId, row);
        });
        document.querySelectorAll(".emu-caller-roulette-bsp[data-player-id]").forEach(badge => {
            const playerId = Number(badge.dataset.playerId || 0);
            const row = expandedBspRowForNode(badge)
                || badge.closest("li,tr,[class*='game'],[class*='table'],[class*='player']")
                || badge.parentElement;
            if (playerId) paintRussianRouletteBspTag(badge, playerId, row);
        });
        document.querySelectorAll(".emu-caller-chain-attack-bsp[data-player-id]").forEach(badge => {
            const playerId = Number(badge.dataset.playerId || 0);
            if (playerId) paintFactionChainBspTag(badge, playerId);
        });
        if (isProfileBspPage()) {
            const playerId = currentProfileBspPlayerId();
            if (playerId) ensureProfileBspBox(playerId);
        }
    }

    function clearCallerBspColumns() {
        document.querySelectorAll(".emu-caller-bsp-cell,.emu-caller-bsp-header").forEach(node => node.remove());
        document.querySelectorAll(".members-list[data-emu-caller-bsp]").forEach(list => list.removeAttribute("data-emu-caller-bsp"));
        document.querySelectorAll("[data-emu-caller-bsp-header]").forEach(header => header.removeAttribute("data-emu-caller-bsp-header"));
    }

    function widenWarLayout(warRoot, twoColumn) {
        if (!(warRoot instanceof HTMLElement)) return;
        if (window.innerWidth <= 700) {
            warRoot.classList.remove("emu-caller-wide-war");
            warRoot.style.removeProperty("--emu-caller-wide-war-width");
            delete warRoot.dataset.emuCallerBaseWidth;
            document.querySelectorAll(".emu-caller-wide-war-shell").forEach(shell => shell.classList.remove("emu-caller-wide-war-shell"));
            return;
        }
        const rect = warRoot.getBoundingClientRect();
        if (!warRoot.dataset.emuCallerBaseWidth) warRoot.dataset.emuCallerBaseWidth = String(Math.floor(rect.width));
        const baseWidth = Math.max(1, Number(warRoot.dataset.emuCallerBaseWidth) || Math.floor(rect.width));
        const available = Math.floor(window.innerWidth - Math.max(0, rect.left) - 16);
        const minimumWidth = twoColumn ? 900 : baseWidth;
        const width = Math.max(baseWidth, minimumWidth, Math.min(1280, available));
        if (width <= 0) return;
        warRoot.classList.add("emu-caller-wide-war");
        warRoot.style.setProperty("--emu-caller-wide-war-width", `${width}px`);
        let ancestor = warRoot.parentElement;
        for (let depth = 0; ancestor && ancestor !== document.body && depth < 4; depth += 1, ancestor = ancestor.parentElement) {
            const overflowX = window.getComputedStyle(ancestor).overflowX;
            if (overflowX === "hidden" || overflowX === "clip") ancestor.classList.add("emu-caller-wide-war-shell");
        }
    }

    function ensureWarBspHeader(membersList) {
        const headerRow = findWarHeaderRow(membersList);
        if (!headerRow) return;
        const side = membersList.getAttribute("data-emu-caller-native-side") || "";
        let header = headerRow.querySelector(":scope > .emu-caller-bsp-header");
        if (header) {
            ensureWarClockSortButton(headerRow, header, side);
            return;
        }
        const cells = Array.from(headerRow.children).filter(node => node instanceof HTMLElement);
        const level = cells.find(cell =>
            cell.classList.contains("level") ||
            cell.classList.contains("lvl") ||
            /^(?:level|lvl)$/i.test(compactText(cell.textContent || ""))
        );
        if (!level) return;
        const isTableCell = level.tagName === "LI" || level.classList.contains("lvl");
        header = document.createElement(level.tagName === "LI" ? "li" : "div");
        header.className = isTableCell
            ? "table-cell bsp-header torn-divider divider-vertical emu-caller-bsp-header"
            : "left bsp-header emu-caller-bsp-header";
        header.setAttribute("data-emu-caller-native", "true");
        header.textContent = "BSP";
        level.after(header);
        ensureWarClockSortButton(headerRow, header, side);
        headerRow.setAttribute("data-emu-caller-bsp-header", "true");
    }

    function ensureWarClockSortButton(headerRow, bspHeader, side) {
        if (!(headerRow instanceof HTMLElement) || !(bspHeader instanceof HTMLElement)) return;
        let clockHeader = headerRow.querySelector(":scope > .emu-caller-clock-header");
        if (!clockHeader) {
            clockHeader = document.createElement(bspHeader.tagName === "LI" ? "li" : "div");
            clockHeader.className = "emu-caller-clock-header";
            clockHeader.setAttribute("data-emu-caller-native", "true");
            bspHeader.after(clockHeader);
        }
        if (clockHeader.querySelector(":scope > .emu-caller-clock-sort")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "emu-caller-clock-sort";
        button.textContent = "\u25f7";
        button.title = "Sort faction timers with the shortest remaining time first";
        button.setAttribute("aria-label", "Sort faction timers with the shortest remaining time first");
        button.setAttribute("data-emu-caller-native", "true");
        button.setAttribute("data-emu-caller-cat-side", side);
        button.setAttribute("data-emu-caller-cat-sort", "clock");
        clockHeader.appendChild(button);
    }

    function findWarHeaderRow(membersList) {
        const cached = state.warHeaderCache.get(membersList);
        if (cached?.isConnected) return cached;
        const isHeader = node => {
            if (!(node instanceof HTMLElement) || node.closest(".emu-caller-cat-board")) return false;
            const children = Array.from(node.children).filter(child => child instanceof HTMLElement);
            if (children.length < 4 || children.length > 9) return false;
            const labels = children.map(cell => cleanWarTableText(cell.textContent || ""));
            return labels.some(label => /^members?$/i.test(label)) &&
                labels.some(label => /^(?:level|lvl)$/i.test(label)) &&
                labels.some(label => /^score$/i.test(label)) &&
                labels.some(label => /^status$/i.test(label)) &&
                labels.some(label => /^attack$/i.test(label));
        };
        const localCandidates = Array.from(membersList.querySelectorAll(".white-grad, .table-header, [class*='tableHeader'], [class*='header'], [role='row'], div, ul, ol"));
        const local = localCandidates.find(isHeader);
        if (local) {
            state.warHeaderCache.set(membersList, local);
            return local;
        }
        const listRect = membersList.getBoundingClientRect();
        const candidates = [];
        let scope = membersList.parentElement;
        for (let depth = 0; scope && depth < 3; depth += 1, scope = scope.parentElement) {
            scope.querySelectorAll(".white-grad, .table-header, [class*='tableHeader'], [class*='header'], [role='row'], div, ul, ol").forEach(node => {
                if (isHeader(node) && !candidates.includes(node)) candidates.push(node);
            });
        }
        const header = candidates.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const scoreA = Math.abs(rectA.left - listRect.left) + Math.abs(rectA.width - listRect.width) + Math.abs(listRect.top - rectA.bottom);
            const scoreB = Math.abs(rectB.left - listRect.left) + Math.abs(rectB.width - listRect.width) + Math.abs(listRect.top - rectB.bottom);
            return scoreA - scoreB;
        })[0] || null;
        if (header) state.warHeaderCache.set(membersList, header);
        return header;
    }

    function bspTotalValue(prediction, fallbackLabel) {
        const fields = [
            prediction?.actual_total_stats,
            prediction?.ActualTBS,
            prediction?.total_stats,
            prediction?.TBS,
            prediction?.bs_estimate
        ];
        for (const value of fields) {
            const parsed = Number(String(value ?? "").replace(/,/g, ""));
            if (Number.isFinite(parsed) && parsed > 0) return parsed;
        }
        const match = String(fallbackLabel || "").replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)\s*([kmbtq]?)/i);
        if (!match) return 0;
        const multiplier = { k: 1e3, m: 1e6, b: 1e9, t: 1e12, q: 1e15 }[String(match[2] || "").toLowerCase()] || 1;
        return Number(match[1]) * multiplier;
    }

    function ownBspComparisonStats() {
        const ownerId = Number(state.owner?.id || state.owner?.playerId || state.owner?.player_id);
        if (!Number.isFinite(ownerId)) return null;
        const prediction = state.bspPredictions.get(ownerId);
        const total = bspTotalValue(prediction, prediction?.label);
        const score = Number(prediction?.score || prediction?.Score || 0);
        return total || score ? { total, score } : null;
    }

    function callerBspTier(total, prediction) {
        const value = Number(total || 0);
        if (!value) return "pending";
        const own = ownBspComparisonStats();
        let relative = own?.total > 0 ? value / own.total : 0;
        const score = Number(prediction?.score || prediction?.Score || 0);
        if (!relative && own?.score > 0 && score > 0) relative = (score / own.score) ** 2;
        if (relative) {
            if (relative <= 0.20) return "grey";
            if (relative <= 0.50) return "white";
            if (relative <= 1.00) return "green";
            if (relative <= 1.50) return "blue";
            if (relative <= 2.25) return "orange";
            return "red";
        }
        if (value >= 2500000000) return "red";
        if (value >= 1000000000) return "orange";
        if (value >= 600000000) return "blue";
        if (value >= 250000000) return "green";
        if (value >= 50000000) return "white";
        return "grey";
    }

    function ensureWarBspCell(row) {
        let cell = Array.from(row.children).find(node => node.classList?.contains("emu-caller-bsp-cell"));
        const level = Array.from(row.children).find(node =>
            node instanceof HTMLElement &&
            !node.classList.contains("emu-caller-bsp-cell") &&
            (node.classList.contains("level") || node.classList.contains("lvl") || Array.from(node.classList).some(name => name.startsWith("level__")))
        );
        if (!cell) {
            if (!level) return null;
            cell = document.createElement(level.tagName === "LI" ? "li" : "div");
            cell.className = level.classList.contains("lvl")
                ? "table-cell bsp-column emu-caller-bsp-cell"
                : "left bsp-column emu-caller-bsp-cell";
            cell.setAttribute("data-emu-caller-native", "true");
            level.after(cell);
        }
        let valueNode = cell.querySelector(":scope > .emu-caller-war-bsp-value");
        if (!valueNode) {
            valueNode = document.createElement("span");
            valueNode.className = "emu-caller-war-bsp-value";
            cell.replaceChildren(valueNode);
        }
        const profile = nativeWarProfileLink(row);
        const playerId = extractPlayerId(profile?.href || "");
        const cached = playerId ? state.bspPredictions.get(Number(playerId)) || {} : {};
        const cachedValue = cleanWarTableText(cached.label || cached.actual_total_stats_human || cached.total_stats_human || cached.bs_estimate_human || formatStatEstimate(cached.actual_total_stats || cached.total_stats || cached.bs_estimate));
        const estimate = cachedValue || "--";
        const total = bspTotalValue(cached, cachedValue);
        const tier = callerBspTier(total, cached);
        const rawSource = cached.Source || cached.source || "";
        const source = cached.provider === "ffscouter" || /ffscouter|ffs/i.test(rawSource) ? "EmuControl" : rawSource || "EmuControl";
        const title = playerId
            ? cachedValue
                ? `${source} estimate: ${estimate} | Player ${playerId}`
                : `${state.bspError || "EmuControl BSP estimate pending"} | Player ${playerId}`
            : "BSP estimate";
        if (valueNode.textContent !== estimate) valueNode.textContent = estimate;
        cell.dataset.provider = cachedValue ? "ffscouter" : "pending";
        cell.dataset.tier = estimate === "--" ? "pending" : tier;
        row.dataset.emuCallerBspTier = cell.dataset.tier;
        cell.dataset.total = String(total || 0);
        if (cell.title !== title) cell.title = title;
        row.querySelector(":scope > .emu-caller-clock-cell")?.remove();
        return cell;
    }

    function ensureWarTableLayout(target) {
        const row = target.row;
        const bspCell = ensureWarBspCell(row);
        const memberCell = row.querySelector(":scope > .member") || directRowChild(target.profileLink, row);
        const closestAttackCell = target.attackLink?.closest(".attack");
        const attackCell = closestAttackCell && closestAttackCell !== target.attackLink && row.contains(closestAttackCell)
            ? closestAttackCell
            : target.attackLink
                ? directRowChild(target.attackLink, row)
                : Array.from(row.children).find(node =>
                    node instanceof HTMLElement
                    && (node.classList.contains("attack") || Array.from(node.classList).some(name => name.startsWith("attack___")))
                ) || null;
        if (!memberCell || !attackCell || memberCell === attackCell) return null;
        const membersList = row.closest(".members-list");
        if (membersList) {
            membersList.setAttribute("data-emu-caller-controls", "true");
            findWarHeaderRow(membersList)?.setAttribute("data-emu-caller-controls-header", "true");
        }
        attackCell.classList.add("emu-caller-attack-cell");
        return { attackCell, memberCell, bspCell };
    }

    function mountCallButtons(target) {
        mountWarInfo(target);
    }

    function applyCallMarkers(rows) {
        rows.forEach(target => {
            if (!mountedWarRowMatchesTarget(target)) {
                clearStaleWarCallMount(target.row);
                return;
            }
            const call = state.calls.get(target.id);
            target.row.classList.toggle("emu-caller-called-row", Boolean(call));
            target.row.classList.toggle("emu-caller-own-called-row", isOwnCall(call));
            target.row.classList.toggle("emu-caller-other-called-row", Boolean(call) && !isOwnCall(call));
            target.row.classList.toggle("emu-caller-pinned-row", state.pinnedTargets.has(Number(target.id)));
            target.row.querySelector(".emu-caller-row-marker")?.remove();
        });
    }

    function sortWarRows(rows) {
        // Torn owns row order; moving its nodes breaks lazy loading on TornPDA.
    }

    function rowScore(target) {
        const timing = targetTiming(target);
        const priority = state.pinnedTargets.has(Number(target.id))
            ? -2000000
            : state.calls.has(target.id)
                ? -1000000
                : 0;
        const timerOrder = Math.min(timing.seconds || 999999, 999999) / 1000000;
        if (timing.kind === "okay") return priority;
        if (timing.kind === "online") return 5 + priority;
        if (timing.kind === "unknown") return 50 + priority;
        if (timing.kind === "hospital") return 100 + timerOrder + priority;
        if (timing.kind === "travel") return 200 + timerOrder + priority;
        return 500 + priority;
    }

    function clearWarRowListing() {
        state.warListingMounted = false;
        document.querySelectorAll(".emu-caller-cat-board,.emu-caller-cat-strip,.emu-caller-cat-row,.emu-caller-cat-header,.emu-caller-row-marker,.emu-caller-row-tools,.emu-caller-name-pin,.emu-caller-bsp-cell,.emu-caller-bsp-header,.emu-caller-clock-cell,.emu-caller-clock-header,.emu-caller-readable-name,.emu-caller-native-level,.emu-caller-native-cd,.emu-caller-native-last,.emu-caller-native-last-header,.emu-caller-native-sort-indicator,.emu-caller-status-chip").forEach(node => node.remove());
        document.querySelectorAll(".emu-caller-feed-status,.emu-caller-timed-status").forEach(cell => {
            cell.classList.remove("emu-caller-feed-status", "emu-caller-timed-status");
            cell.removeAttribute("data-emu-caller-status");
            cell.removeAttribute("data-emu-caller-status-kind");
        });
        document.querySelectorAll("[data-emu-caller-native-row],[data-emu-caller-native-header],[data-emu-caller-native-table],[data-emu-caller-native-side]").forEach(node => {
            node.removeAttribute("data-emu-caller-native-row");
            node.removeAttribute("data-emu-caller-native-header");
            node.removeAttribute("data-emu-caller-native-table");
            node.removeAttribute("data-emu-caller-native-side");
        });
        document.querySelectorAll("[data-emu-caller-native-player-id],[data-emu-caller-meta-revision]").forEach(node => {
            node.removeAttribute("data-emu-caller-native-player-id");
            node.removeAttribute("data-emu-caller-meta-revision");
        });
        document.querySelectorAll("[data-emu-caller-cat-sort]").forEach(node => {
            node.removeAttribute("data-emu-caller-cat-sort");
            node.removeAttribute("data-emu-caller-cat-side");
            node.classList.remove("emu-caller-native-sort");
        });
        document.querySelectorAll(".emu-caller-native-member-host,.emu-caller-compact-member").forEach(node => node.classList.remove("emu-caller-native-member-host", "emu-caller-compact-member"));
        document.querySelectorAll(".emu-caller-pin-host").forEach(node => node.classList.remove("emu-caller-pin-host"));
        document.querySelectorAll(".emu-caller-row-enhanced,.emu-caller-called-row,.emu-caller-own-called-row,.emu-caller-other-called-row,.emu-caller-pinned-row,.emu-caller-random-pick").forEach(row => {
            row.classList.remove("emu-caller-row-enhanced", "emu-caller-called-row", "emu-caller-own-called-row", "emu-caller-other-called-row", "emu-caller-pinned-row", "emu-caller-random-pick", "emu-caller-table-row");
        });
        document.querySelectorAll(".emu-caller-native-attack-link").forEach(link => link.classList.remove("emu-caller-native-attack-link"));
        document.querySelectorAll(".emu-caller-table-header").forEach(header => header.classList.remove("emu-caller-table-header"));
        document.querySelectorAll(".members-list[data-emu-caller-bsp]").forEach(list => list.removeAttribute("data-emu-caller-bsp"));
        document.querySelectorAll("[data-emu-caller-bsp-header]").forEach(header => header.removeAttribute("data-emu-caller-bsp-header"));
        document.querySelectorAll(".members-list[data-emu-caller-controls]").forEach(list => list.removeAttribute("data-emu-caller-controls"));
        document.querySelectorAll("[data-emu-caller-controls-header]").forEach(header => header.removeAttribute("data-emu-caller-controls-header"));
        document.querySelectorAll(".members-list[data-emu-caller-cat]").forEach(list => {
            list.removeAttribute("data-emu-caller-cat");
            list.removeAttribute("data-emu-caller-cat-side");
        });
        document.querySelectorAll("[data-emu-caller-cat-header-host]").forEach(header => header.removeAttribute("data-emu-caller-cat-header-host"));
        document.querySelectorAll("[data-emu-caller-cat-row-host]").forEach(row => row.removeAttribute("data-emu-caller-cat-row-host"));
        document.querySelectorAll("[data-emu-caller-sort-active]").forEach(parent => parent.removeAttribute("data-emu-caller-sort-active"));
        document.querySelectorAll("[data-emu-caller-native-row]").forEach(row => row.style.removeProperty("order"));
        document.querySelectorAll(".members-list[data-emu-caller-cat-source]").forEach(list => list.removeAttribute("data-emu-caller-cat-source"));
        document.querySelectorAll(".members-list[data-emu-war-table-host],.members-list[data-emu-war-table-inactive]").forEach(list => {
            list.removeAttribute("data-emu-war-table-host");
            list.removeAttribute("data-emu-war-table-inactive");
        });
        document.querySelectorAll("[data-emu-caller-cat-native-header]").forEach(header => header.removeAttribute("data-emu-caller-cat-native-header"));
        document.querySelectorAll("[data-emu-caller-native-member-header]").forEach(header => header.removeAttribute("data-emu-caller-native-member-header"));
        document.querySelectorAll(".faction-war.emu-caller-two-column-war").forEach(root => root.classList.remove("emu-caller-two-column-war"));
        document.querySelectorAll(".emu-caller-native-panel").forEach(panel => {
            panel.classList.remove("emu-caller-native-panel");
            panel.removeAttribute("data-emu-caller-native-panel-side");
        });
        document.querySelectorAll(".emu-caller-native-panel-row").forEach(row => row.classList.remove("emu-caller-native-panel-row"));
        document.querySelectorAll(".faction-war.emu-caller-compact-war").forEach(root => root.classList.remove("emu-caller-compact-war"));
        document.querySelectorAll(".faction-war.emu-caller-wide-war").forEach(root => {
            root.classList.remove("emu-caller-wide-war");
            root.style.removeProperty("--emu-caller-wide-war-width");
            delete root.dataset.emuCallerBaseWidth;
        });
        document.querySelectorAll(".emu-caller-wide-war-shell").forEach(shell => shell.classList.remove("emu-caller-wide-war-shell"));
        document.querySelectorAll(".emu-caller-native-cell,.emu-caller-native-header-cell,.emu-caller-attack-cell").forEach(cell => {
            cell.classList.remove("emu-caller-native-cell", "emu-caller-native-header-cell", "emu-caller-member-cell", "emu-caller-level-cell", "emu-caller-score-native-cell", "emu-caller-status-native-cell", "emu-caller-attack-cell");
        });
    }

    function targetTiming(target) {
        const meta = warStatusMetaFor(target.id, target.meta || state.targetMeta.get(Number(target.id)) || {});
        const now = Date.now() / 1000;
        const statusNode = target.row?.querySelector?.(":scope > [class*='status___'],:scope > .status") || target.row?.querySelector?.("[class*='status___'],.status");
        const statusCell = directRowChild(statusNode, target.row);
        const nativeStatus = nativeWarStatusText(statusCell);
        const nativeLower = nativeStatus.toLowerCase();
        const nativeSeconds = parseDurationFromText(nativeStatus);
        const explicitHospitalUntil = Number(meta.hospitalUntil || 0);
        if (/hosp|hospital/.test(nativeLower) && explicitHospitalUntil > 0 && explicitHospitalUntil <= now && !nativeSeconds) {
            return { kind: "okay", seconds: 0 };
        }
        if (/hosp|hospital/.test(nativeLower)) {
            const feedSeconds = Number(meta.hospitalUntil || 0) > now ? Number(meta.hospitalUntil) - now : 0;
            return { kind: "hospital", seconds: nativeSeconds || feedSeconds || 999999 };
        }
        if (/travel|flying|returning|abroad|eta/.test(nativeLower)) {
            const feedSeconds = Number(meta.travelUntil || 0) > now ? Number(meta.travelUntil) - now : 0;
            return { kind: "travel", seconds: nativeSeconds || feedSeconds || 999999 };
        }
        if (/okay/.test(nativeLower)) return { kind: "okay", seconds: 0 };
        if (meta.hospitalUntil && meta.hospitalUntil > now) return { kind: "hospital", seconds: meta.hospitalUntil - now };
        if (meta.travelUntil && meta.travelUntil > now) return { kind: "travel", seconds: meta.travelUntil - now };
        const status = String(target.status || statusFromTargetMeta(target.id) || rowStatus(target.row) || "");
        const text = `${status} ${target.row?.innerText || ""}`;
        const lower = text.toLowerCase();
        const seconds = parseDurationFromText(status) || parseDurationFromText(text);
        if (/hosp|hospital/.test(lower)) return { kind: "hospital", seconds: seconds || 999999 };
        if (/travel|flying|returning|abroad|eta|mexico|cayman|canada|hawaii|united kingdom|argentina|switzerland|japan|china|uae|south africa/.test(lower)) {
            return { kind: "travel", seconds: seconds || 999999 };
        }
        if (/okay/.test(lower)) return { kind: "okay", seconds: 0 };
        if (/online/.test(lower)) return { kind: "online", seconds: 0 };
        return { kind: "unknown", seconds: 999999 };
    }

    function targetDetailBadges(target) {
        const meta = warStatusMetaFor(target.id, target.meta || state.targetMeta.get(Number(target.id)) || {});
        const live = onlineTelemetryFor(target.id);
        const timing = targetTiming(target);
        const details = [];
        const energy = meta.energy || live.energy || extractEnergyFromRow(target.row);
        const drug = meta.drugCooldown || live.drugCooldown || extractCooldownFromRow(target.row, "drug");
        const booster = meta.boosterCooldown || live.boosterCooldown || extractCooldownFromRow(target.row, "booster");
        const medical = meta.medicalCooldown || live.medicalCooldown || extractCooldownFromRow(target.row, "medical");
        if (energy) details.push({ kind: "energy", label: "E", title: "Energy", value: energy });
        if (drug) details.push({ kind: "drug", label: "D", title: "Drug cooldown", value: drug });
        if (booster) details.push({ kind: "booster", label: "B", title: "Booster cooldown", value: booster });
        if (medical) details.push({ kind: "medical", label: "M", title: "Medical cooldown", value: medical });
        if (timing.kind === "hospital" && timing.seconds) details.push({ kind: "hospital", label: "H", title: "Hospital", value: formatRemainingSeconds(timing.seconds) });
        if (timing.kind === "travel" && timing.seconds) details.push({ kind: "travel", label: "ETA", title: "Travel ETA", value: formatRemainingSeconds(timing.seconds) });
        return details.slice(0, 4);
    }

    function detailBadgesHtml(details) {
        if (!details.length) return `<span class="emu-caller-detail-empty">-</span>`;
        return details.map(detail => `<b class="emu-caller-detail-chip kind-${escapeAttr(detail.kind || "info")}" title="${escapeAttr(detail.title || detail.label)}">${escapeHtml(detail.label)} <span>${escapeHtml(detail.value)}</span></b>`).join("");
    }

    function onlineTelemetryFor(id) {
        const telemetry = state.memberTelemetryById.get(Number(id));
        return telemetry && typeof telemetry === "object" ? telemetry : {};
    }

    function collectOwnTelemetry() {
        const telemetryRoot = document.querySelector("#sidebarroot") || document.querySelector("[class*='user-information']");
        const hints = Array.from(telemetryRoot?.querySelectorAll("[title],[aria-label],[data-tooltip],[data-tooltip-content]") || [])
            .slice(0, 250)
            .map(node => [node.getAttribute("title"), node.getAttribute("aria-label"), node.getAttribute("data-tooltip"), node.getAttribute("data-tooltip-content")].filter(Boolean).join(" "))
            .join(" ");
        const text = compactStatusText(`${telemetryRoot?.innerText || ""} ${hints}`, 12000);
        const energy = firstMatch(text, [
            /\bEnergy\s*:?\s*(\d{1,4}\s*\/\s*\d{1,4})/i,
            /(?:^|\s)E\s*:?\s*(\d{1,4}\s*\/\s*\d{1,4})/i
        ]).replace(/\s+/g, "");
        return {
            energy,
            drugCooldown: normalizeTimerLabel(firstMatch(text, [
                /\bDrug(?:s| cooldown| cd)?\s*:?\s*([0-9]{1,2}(?::[0-9]{2}){1,2}|[0-9dhms ]{2,20})/i
            ])),
            boosterCooldown: normalizeTimerLabel(firstMatch(text, [
                /\bBooster(?: cooldown| cd)?\s*:?\s*([0-9]{1,2}(?::[0-9]{2}){1,2}|[0-9dhms ]{2,20})/i
            ])),
            medicalCooldown: normalizeTimerLabel(firstMatch(text, [
                /\b(?:Medical|Med)(?: cooldown| cd)?\s*:?\s*([0-9]{1,2}(?::[0-9]{2}){1,2}|[0-9dhms ]{2,20})/i
            ]))
        };
    }

    function extractEnergyFromRow(row) {
        return firstMatch(row?.innerText || "", [
            /\bEnergy\s*:?\s*(\d{1,4}\s*\/\s*\d{1,4})/i,
            /(?:^|\s)E\s*:?\s*(\d{1,4}\s*\/\s*\d{1,4})/i
        ]).replace(/\s+/g, "");
    }

    function extractCooldownFromRow(row, type) {
        const text = row?.innerText || "";
        const pattern = type === "medical"
            ? /\b(?:Medical|Med)(?: cooldown| cd)?\s*:?\s*([0-9]{1,2}(?::[0-9]{2}){1,2}|[0-9dhms ]{2,20})/i
            : type === "booster"
                ? /\bBooster(?: cooldown| cd)?\s*:?\s*([0-9]{1,2}(?::[0-9]{2}){1,2}|[0-9dhms ]{2,20})/i
                : /\bDrug(?:s| cooldown| cd)?\s*:?\s*([0-9]{1,2}(?::[0-9]{2}){1,2}|[0-9dhms ]{2,20})/i;
        const value = firstMatch(text, [pattern]);
        return normalizeTimerLabel(value);
    }

    function firstMatch(text, patterns) {
        for (const pattern of patterns) {
            const match = String(text || "").match(pattern);
            if (match?.[1]) return String(match[1]).trim();
        }
        return "";
    }

    function normalizeTimerLabel(value) {
        if (!value) return "";
        const parsed = parseTimeValue(value);
        const now = Math.floor(Date.now() / 1000);
        if (parsed && parsed > now) return formatRemainingSeconds(parsed - now);
        const seconds = parseDurationFromText(value);
        if (seconds) return formatRemainingSeconds(seconds);
        return compactStatusText(value, 18);
    }

    function parseDurationFromText(text) {
        text = String(text || "");
        const clock = text.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/);
        if (clock) {
            const hours = Number(clock[1] || 0);
            const minutes = Number(clock[2] || 0);
            const seconds = Number(clock[3] || 0);
            return hours * 3600 + minutes * 60 + seconds;
        }
        let total = 0;
        text.replace(/(\d+)\s*(d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)\b/gi, (_match, amount, unit) => {
            const value = Number(amount);
            const lower = String(unit).toLowerCase();
            if (lower.startsWith("d")) total += value * 86400;
            else if (lower.startsWith("h")) total += value * 3600;
            else if (lower.startsWith("m")) total += value * 60;
            else total += value;
            return "";
        });
        return total;
    }

    function readFavoriteTargets() {
        try {
            state.favoriteTargets = normalizeFavoriteTargets(JSON.parse(getValue(STORAGE.favoriteTargets, "[]") || "[]"));
        } catch (err) {
            state.favoriteTargets = [];
        }
        return state.favoriteTargets;
    }

    async function syncFavoriteTargetsFromServer(force = false) {
        if (!getApiKey()) return readFavoriteTargets();
        if (
            !force &&
            state.favoriteTargetsLoadedAt &&
            Date.now() - state.favoriteTargetsLoadedAt < 60 * 1000
        ) {
            return readFavoriteTargets();
        }
        if (state.favoriteTargetsSyncPromise) return state.favoriteTargetsSyncPromise;
        state.favoriteTargetsSyncPromise = (async () => {
            const cachedFavorites = readFavoriteTargets();
            const data = await apiRequest("/api/chain-pinned-targets", null, "GET");
            let favorites = normalizeFavoriteTargets(
                Array.isArray(data?.targets) ? data.targets : []
            );
            if (!favorites.length && !Number(data?.updated_at || 0) && cachedFavorites.length) {
                const seeded = await apiRequest(
                    "/api/chain-pinned-targets",
                    { targets: cachedFavorites },
                    "POST"
                );
                favorites = normalizeFavoriteTargets(
                    Array.isArray(seeded?.targets) ? seeded.targets : cachedFavorites
                );
            }
            state.favoriteTargets = favorites;
            state.favoriteTargetsLoadedAt = Date.now();
            setValue(STORAGE.favoriteTargets, JSON.stringify(favorites));
            if (state.panelBuilt) renderPanel();
            return favorites;
        })().catch(() => readFavoriteTargets()).finally(() => {
            state.favoriteTargetsSyncPromise = null;
        });
        return state.favoriteTargetsSyncPromise;
    }

    function favoriteTargetStatusText(profile) {
        const status = profile?.status;
        return [
            typeof status === "string" ? status : status?.state,
            status?.description,
            status?.details,
            profile?.statusState,
            profile?.status_state,
            profile?.state,
            profile?.life?.status,
            profile?.life_status,
            profile?.player_status
        ].filter(Boolean).join(" ");
    }

    function favoriteTargetIsReady(profile) {
        const status = favoriteTargetStatusText(profile);
        if (/hospital|jail|travel|flying|abroad|federal|fallen|dead|disabled/i.test(status)) return false;
        return /\bokay\b/i.test(status);
    }

    function favoriteTargetSnapshotLooksReady(target) {
        return favoriteTargetIsReady({
            status: target?.status,
            statusState: target?.statusState,
            status_state: target?.status_state
        });
    }

    async function openFavoriteTarget() {
        if (!getApiKey()) {
            state.lastError = "Add your Custom or Full Access Torn API key before using Favourite target.";
            showToast(state.lastError);
            renderPanel();
            return;
        }

        state.lastError = "Loading pinned targets...";
        renderPanel();
        const favorites = await syncFavoriteTargetsFromServer(true);
        if (!favorites.length) {
            state.lastError = "No pinned targets are saved to this account. Pin targets in Target Finder and try again.";
            showToast(state.lastError);
            renderPanel();
            return;
        }

        const recent = readRecentChainTargetIds();
        const candidates = favorites.slice().sort((left, right) => {
            const recentDifference = Number(recent.has(Number(left.id))) - Number(recent.has(Number(right.id)));
            if (recentDifference) return recentDifference;
            const readyDifference = Number(favoriteTargetSnapshotLooksReady(right)) - Number(favoriteTargetSnapshotLooksReady(left));
            if (readyDifference) return readyDifference;
            return Number(right.pinned_at || 0) - Number(left.pinned_at || 0);
        }).slice(0, 5);

        state.lastError = `Live-checking ${candidates.length} favourite target${candidates.length === 1 ? "" : "s"}...`;
        renderPanel();
        try {
            const checks = await Promise.allSettled(candidates.map(async target => {
                const payload = await apiRequest(`/api/torn/user/${encodeURIComponent(target.id)}/profile?fresh=1`, null, "GET");
                const profile = payload?.profile || payload?.user || payload?.data || payload || {};
                return { target, profile };
            }));
            const ready = checks
                .filter(result => result.status === "fulfilled" && favoriteTargetIsReady(result.value.profile))
                .map(result => result.value);
            if (!ready.length) {
                throw new Error("No saved favourite target is currently Okay. Refresh your pinned list or try again shortly.");
            }

            const picked = ready[Math.floor(Math.random() * ready.length)];
            const id = Number(picked.target.id);
            const name = String(picked.profile?.name || picked.profile?.player_name || picked.target.name || `Player ${id}`);
            const attackUrl = `https://www.torn.com/page.php?sid=attack&user2ID=${encodeURIComponent(id)}`;
            rememberChainTarget(id);
            state.lastError = `Opening favourite target: ${name} [${id}]`;
            showToast(state.lastError);
            renderPanel();
            void logCallerEvent({
                eventId: `favourite-target:${id}:${Date.now()}`,
                type: "favourite-target",
                warId: state.warId || detectWarId() || "chain",
                targetId: id,
                targetName: name,
                message: `Favourite target opened: ${name} [${id}]`,
                attackUrl,
                source: "emu-war-caller-pda"
            });
            window.setTimeout(() => window.location.assign(attackUrl), 150);
        } catch (err) {
            state.lastError = `Favourite target failed: ${friendlyError(err)}`;
            showToast(state.lastError);
            renderPanel();
        }
    }

    async function openChainTarget() {
        if (!getApiKey()) {
            state.lastError = "Add your Custom or Full Access Torn API key before using Chain target.";
            renderPanel();
            return;
        }
        state.lastError = "Live-checking a weak chain target...";
        renderPanel();
        try {
            const data = await apiRequest(CHAIN_TARGET_SEARCH);
            const candidates = normalizeChainTargets(data).filter(isChainTargetEligible).sort(chainTargetScore);
            if (!candidates.length) throw new Error("No live-verified weak targets in Torn City are available. Try again shortly.");
            const estimated = candidates.filter(target => chainTargetEstimate(target) > 0);
            const tierLimit = CHAIN_TARGET_STAT_TIERS.find(limit => estimated.some(target => chainTargetEstimate(target) <= limit));
            if (!tierLimit) throw new Error("No verified inactive targets under 20,000 battle stats are available. Try again shortly.");
            const safestTier = estimated.filter(target => chainTargetEstimate(target) <= tierLimit);
            const recent = readRecentChainTargetIds();
            const unseen = safestTier.filter(target => !recent.has(chainTargetId(target)));
            const ranked = unseen.length ? unseen : safestTier;
            const pool = ranked.slice(0, Math.min(8, ranked.length));
            const picked = pool[Math.floor(Math.random() * pool.length)];
            const id = chainTargetId(picked);
            const name = String(picked?.name || picked?.player_name || `Player ${id}`);
            const estimate = chainTargetEstimate(picked);
            const attackUrl = `https://www.torn.com/page.php?sid=attack&user2ID=${encodeURIComponent(id)}`;
            rememberChainTarget(id);
            state.lastError = `Opening weak chain target: ${name} [${id}] - BSP ${Math.round(estimate).toLocaleString()}`;
            renderPanel();
            void logCallerEvent({
                eventId: `chain-target:${id}:${Date.now()}`,
                type: "chain-target",
                warId: state.warId || detectWarId() || "chain",
                targetId: id,
                targetName: name,
                message: `Chain target opened: ${name} [${id}]`,
                attackUrl,
                source: "emu-war-caller-pda"
            });
            window.setTimeout(() => window.location.assign(attackUrl), 150);
        } catch (err) {
            state.lastError = `Chain target failed: ${friendlyError(err)}`;
            renderPanel();
        }
    }

    function isWarTargetAvailable(target) {
        const timing = targetTiming(target);
        if (timing.kind === "hospital" || timing.kind === "travel") return false;
        const text = `${target.status || ""} ${target.row?.innerText || ""}`.toLowerCase();
        if (/hospital|travel|flying|abroad|returning/.test(text)) return false;
        return timing.kind === "okay" || timing.kind === "online" || /okay|online/i.test(text);
    }

    function normalizeChainTargets(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.targets)) return data.targets;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }

    function chainTargetId(target) {
        const value = target?.player_id ?? target?.playerId ?? target?.id ?? target?.target;
        return /^\d{3,10}$/.test(String(value || "")) ? Number(value) : 0;
    }

    function isChainTargetEligible(target) {
        if (!chainTargetId(target) || !isChainTargetFactionless(target)) return false;
        const status = chainTargetStatus(target);
        if (/hospital|jail|travel|flying|abroad|federal|fallen|dead|disabled/i.test(status)) return false;
        const age = chainTargetInactiveSeconds(target);
        return age === null || age >= CHAIN_TARGET_INACTIVE_SECONDS;
    }

    function isChainTargetFactionless(target) {
        const faction = target?.faction ?? target?.faction_id ?? target?.factionId ?? target?.faction_name ?? target?.factionName;
        if (faction === undefined || faction === null || faction === "" || faction === 0 || faction === "0") return true;
        if (typeof faction === "object") return !(faction.id || faction.ID || faction.name || faction.faction_id);
        return /^(?:none|n\/a|null|factionless)$/i.test(String(faction).trim());
    }

    function chainTargetStatus(target) {
        const status = target?.status;
        return [
            typeof status === "string" ? status : status?.state,
            status?.description,
            target?.state,
            target?.life?.status,
            target?.life_status,
            target?.player_status
        ].filter(Boolean).join(" ");
    }

    function chainTargetInactiveSeconds(target) {
        const raw = target?.last_action ?? target?.lastAction ?? target?.last_action_timestamp ?? target?.lastActionTimestamp;
        if (raw && typeof raw === "object") {
            if (Number(raw.timestamp) > 1000000000) return Math.max(0, Math.floor(Date.now() / 1000) - Number(raw.timestamp));
            return parseChainRelativeSeconds(raw.relative || raw.status);
        }
        if (Number(raw) > 1000000000) return Math.max(0, Math.floor(Date.now() / 1000) - Number(raw));
        return parseChainRelativeSeconds(raw || target?.last_action_relative || target?.lastActionRelative || target?.last_seen || target?.lastSeen);
    }

    function parseChainRelativeSeconds(value) {
        const text = String(value || "").toLowerCase();
        if (!text || text === "-") return null;
        if (/online|now|just/.test(text)) return 0;
        const match = text.match(/(\d+(?:\.\d+)?)\s*(second|sec|minute|min|hour|hr|day|week|month|year)/i);
        if (!match) return null;
        const amount = Number(match[1]);
        const unit = match[2].toLowerCase();
        if (unit.startsWith("sec")) return amount;
        if (unit.startsWith("min")) return amount * 60;
        if (unit.startsWith("hour") || unit.startsWith("hr")) return amount * 3600;
        if (unit.startsWith("day")) return amount * 86400;
        if (unit.startsWith("week")) return amount * 7 * 86400;
        if (unit.startsWith("month")) return amount * 30 * 86400;
        if (unit.startsWith("year")) return amount * 365 * 86400;
        return null;
    }

    function chainTargetScore(target) {
        const estimate = chainTargetEstimate(target);
        const fairFight = Number(target?.bsp?.fair_fight ?? target?.fair_fight ?? target?.ff);
        const level = Number(target?.level);
        const estimateScore = estimate > 0 ? Math.log10(estimate) : 99;
        const fairFightScore = Number.isFinite(fairFight) && fairFight > 0 ? fairFight : 9;
        const levelScore = Number.isFinite(level) && level > 0 ? level : 100;
        return estimateScore * 1000 + fairFightScore * 100 + levelScore;
    }

    function chainTargetEstimate(target) {
        return compactNumberValue(target?.bsp?.actual_tbs || target?.bsp?.tbs || target?.bsp?.tbs_human || target?.bs_estimate || target?.bs_estimate_human || target?.bss_public);
    }

    function readRecentChainTargetIds() {
        const now = Date.now();
        try {
            const entries = JSON.parse(getValue(STORAGE.recentChainTargets, "[]") || "[]");
            return new Set(entries.filter(entry => now - Number(entry?.at || 0) < CHAIN_TARGET_RECENT_MS).map(entry => Number(entry.id)).filter(Boolean));
        } catch (err) {
            return new Set();
        }
    }

    function rememberChainTarget(id) {
        const now = Date.now();
        let entries = [];
        try {
            entries = JSON.parse(getValue(STORAGE.recentChainTargets, "[]") || "[]");
        } catch (err) {
            entries = [];
        }
        entries = entries.filter(entry => Number(entry?.id) !== Number(id) && now - Number(entry?.at || 0) < CHAIN_TARGET_RECENT_MS);
        entries.unshift({ id: Number(id), at: now });
        setValue(STORAGE.recentChainTargets, JSON.stringify(entries.slice(0, 50)));
    }

    function compactNumberValue(value) {
        const source = String(value || "").trim().toLowerCase().replace(/,/g, "");
        const match = source.match(/(\d+(?:\.\d+)?)\s*([kmbt])?/);
        if (!match) return 0;
        const amount = Number(match[1]);
        const suffix = match[2] || "";
        if (!Number.isFinite(amount)) return 0;
        if (suffix === "t") return amount * 1000000000000;
        if (suffix === "b") return amount * 1000000000;
        if (suffix === "m") return amount * 1000000;
        if (suffix === "k") return amount * 1000;
        return amount;
    }

    function extractRowLevel(row) {
        const text = row?.innerText || "";
        const match = text.match(/\b(?:lvl|level)\s*\.?\s*(\d{1,3})\b/i);
        return match ? Number(match[1]) || 0 : 0;
    }

    function findAttackHintPlacement() {
        const heading = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, [class*='title']"))
            .find(node => /^attacking$/i.test(compactText(node.textContent || "")));
        if (!heading) return null;
        const actionControl = Array.from(document.querySelectorAll("a,button,[role='button']"))
            .find(control => /^(?:back to profile|escape)$/i.test(compactText(control.textContent || "")));
        if (!actionControl) {
            const host = heading.parentElement;
            return host instanceof HTMLElement && host !== document.body
                ? { host, before: heading.nextSibling }
                : null;
        }
        const headingAncestors = new Set();
        let current = heading;
        while (current && current !== document.body) {
            headingAncestors.add(current);
            current = current.parentElement;
        }
        let host = actionControl;
        while (host && host !== document.body && !headingAncestors.has(host)) host = host.parentElement;
        if (!host || host === document.body) {
            const headingHost = heading.parentElement;
            return headingHost instanceof HTMLElement && headingHost !== document.body
                ? { host: headingHost, before: heading.nextSibling }
                : null;
        }
        let before = actionControl;
        while (before.parentElement && before.parentElement !== host) before = before.parentElement;
        return { host, before };
    }

    function renderAttackPageHint() {
        if (!isAttackPage()) {
            document.getElementById("emu-caller-attack-hint")?.remove();
            document.querySelectorAll(".emu-caller-attack-bar-host").forEach(host => host.classList.remove("emu-caller-attack-bar-host"));
            return;
        }
        if (!state.attackUiReady) return;
        maybeLogFightFinished("dom", null);
        let hint = document.getElementById("emu-caller-attack-hint");
        if (!hint) {
            hint = document.createElement("div");
            hint.id = "emu-caller-attack-hint";
        }
        const placement = findAttackHintPlacement();
        const mountAttackHint = () => {
            document.querySelectorAll(".emu-caller-attack-bar-host").forEach(host => {
                if (host !== placement?.host) host.classList.remove("emu-caller-attack-bar-host");
            });
            hint.classList.remove("fight-safe", "fallback");
            if (placement) {
                placement.host.classList.add("emu-caller-attack-bar-host");
                placement.host.insertBefore(hint, placement.before);
                hint.classList.add("pinned");
            } else {
                const fallbackHost = document.querySelector("main, #mainContainer") || document.body;
                fallbackHost.insertBefore(hint, fallbackHost.firstChild);
                hint.classList.remove("pinned");
                hint.classList.add("fallback");
            }
        };
        const attackHintHost = placement?.host || document.querySelector("main, #mainContainer") || document.body;
        const attackHintMoving = !hint.isConnected || hint.parentElement !== attackHintHost || (placement && !placement.host.classList.contains("emu-caller-attack-bar-host"));
        if (attackHintMoving) preserveViewportAnchor(mountAttackHint);
        else mountAttackHint();
        const target = detectAttackTarget();
        const rallySubmitCooling = state.rallyPending || Date.now() < state.rallyCooldownUntil;
        const activeRally = activeAssistanceRally(target.id);
        const activeRallyIsOwn = isOwnRally(activeRally);
        const ownerId = Number(state.owner?.id || state.owner?.playerId || 0);
        const ownerJoinedRally = Boolean(activeRally && !activeRallyIsOwn && ownerId && Array.isArray(activeRally.participants) && activeRally.participants.some(participant => Number(participant?.id || 0) === ownerId));
        const activeRallyFilled = activeRally ? rallyAssistCount(activeRally) : 0;
        const activeRallySlots = activeRally ? Math.max(1, Math.min(5, Number(activeRally.slots) || 1)) : 0;
        const attackComplete = Boolean(target.id && Number(state.attackCompleteTargetId) === Number(target.id));
        const callReleased = attackComplete && Number(state.attackCompleteCallReleasedTargetId) === Number(target.id);
        hint.classList.toggle("requested", Boolean(activeRally) && !attackComplete);
        hint.classList.toggle("complete", attackComplete);
        hint.innerHTML = attackComplete ? `
      <span class="emu-caller-help-requested">
        <b>Attack complete</b>
        <small>${callReleased ? "Call released &mdash; target can be called again." : "No active call was changed."}</small>
      </span>
    ` : activeRally ? `
      <span class="emu-caller-help-requested">
        <b>${activeRallyIsOwn ? "Help has been requested" : ownerJoinedRally ? "You joined assistance" : "Assistance request active"}</b>
        <small>${escapeHtml(rallyRequestHeading(activeRally, activeRallyFilled, activeRallySlots))}</small>
      </span>
      ${activeRallyIsOwn ? `<button type="button" class="emu-caller-cancel-rally" data-cancel-rally="${escapeAttr(activeRally.id)}">Cancel</button>` : ""}
    ` : `
      <span class="emu-caller-rally-buttons" title="${target.id ? `Request help on ${escapeAttr(target.name || target.id)}` : "Target not found yet"}">
        <span class="emu-caller-rally-group faction"><b>Faction</b>${[1, 2, 3, 4, 5].map(slots => `<button type="button" data-rally-scope="faction" data-rally-slots="${slots}" ${target.id && !rallySubmitCooling ? "" : "disabled"}>${slots}x</button>`).join("")}</span>
        <span class="emu-caller-rally-group alliance"><b>${escapeHtml(allianceRallyLabel())}</b>${[1, 2, 3, 4, 5].map(slots => `<button type="button" data-rally-scope="alliance" data-rally-slots="${slots}" ${target.id && !rallySubmitCooling ? "" : "disabled"}>${slots}x</button>`).join("")}</span>
      </span>
    `;
        hint.querySelectorAll("[data-rally-slots]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                sendRallyRequest(Number(button.dataset.rallySlots || 1), String(button.dataset.rallyScope || "alliance"), target);
            });
        });
        hint.querySelector("[data-cancel-rally]")?.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            cancelRallyRequest(String(event.currentTarget.dataset.cancelRally || ""));
        });
    }

    function findChainText() {
        const chain = findTornChainSnapshot();
        if (chain?.hits) return `Chain: ${chain.hits} / ${nextChainBonus(chain.hits)}`;
        const candidates = Array.from(document.querySelectorAll("a[href*='/war/chain'],#sidebarroot [class*='chain'],#sidebarroot [id*='chain'],[data-chain]")).slice(0, 60);
        for (const node of candidates) {
            if (node.closest("#emu-war-caller-root,#emu-caller-chain-flash-overlay")) continue;
            const text = compactText(node).slice(0, 500);
            const match = text.match(/Chain:\s*\d+\s*\/\s*\d+.{0,32}/i) || text.match(/\d+\s*hits?\s*(?:left|to bonus)/i);
            if (match) return match[0];
        }
        return "";
    }

    function chainBonusInfo() {
        const chainText = findChainText();
        const parsed = parseChainProgress(chainText);
        if (!parsed) return { label: chainText || "Attack support", className: "" };
        const next = nextChainBonus(parsed.current);
        const remaining = Math.max(0, next - parsed.current);
        if (remaining <= 1) return { label: `NEXT BONUS HIT: ${parsed.current}/${next}`, className: "bonus-now" };
        if (remaining <= 3) return { label: `Chain: ${parsed.current}/${next} - ${remaining} hits left`, className: "bonus-soon" };
        return { label: `Chain: ${parsed.current}/${next} - ${remaining} hits left`, className: "" };
    }

    function parseChainProgress(text) {
        const source = String(text || "");
        let match = source.match(/Chain:\s*([\d,]+)\s*\/\s*([\d,]+)/i);
        if (match) {
            return {
                current: Number(match[1].replace(/,/g, "")) || 0,
                next: Number(match[2].replace(/,/g, "")) || 0
            };
        }
        match = source.match(/([\d,]+)\s*hits?\s*(?:left|to bonus)/i);
        if (!match) return null;
        const remaining = Number(match[1].replace(/,/g, "")) || 0;
        const currentMatch = source.match(/Chain[^\d]{0,12}([\d,]+)/i);
        const current = currentMatch ? Number(currentMatch[1].replace(/,/g, "")) || 0 : 0;
        const next = current + remaining;
        return next ? { current, next } : null;
    }

    function nextChainBonus(current) {
        const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
        const chain = Number(current) || 0;
        return milestones.find(value => value > chain) || (Math.floor(chain / 100000) + 1) * 100000;
    }

    function maybeLogFightFinished(source, payload) {
        if (!isAttackPage()) return;
        const target = detectAttackTarget();
        if (!target.id) return;
        const rally = activeAssistanceRally(target.id);
        const payloadText = (() => {
            try {
                return compactText(JSON.stringify(payload || {})).slice(0, 5000);
            } catch (err) {
                return "";
            }
        })();
        const bodyText = compactText(document.querySelector("main, #mainContainer, #mainroot")?.innerText || "").slice(0, 7000);
        const text = `${payloadText} ${bodyText}`;
        const result = /\b(?:you\s+(?:were\s+)?defeated|you\s+lost|defeat|lost\s+to)\b/i.test(text)
            ? "lost"
            : /\bstalemate\b/i.test(text)
                ? "stalemate"
                : /\b(?:you\s+(?:defeated|won|mugged|hospitali[sz]ed|left\b[^.]{0,100}\bon\s+the\s+street)|victory|won\s+[\d,]+(?:\.\d+)?)\b/i.test(text)
                    ? "won"
                    : "";
        if (!result) {
            if (rally && /\b(?:currently\s+)?in\s+hospital\b[\s\S]{0,80}\bcannot\s+be\s+attacked\b/i.test(text)) {
                const unavailableKey = `unavailable:${rally.id || target.id}:${target.id}`;
                if (state.lastFightEventKey === unavailableKey) return;
                state.lastFightEventKey = unavailableKey;
                state.attackCompleteTargetId = target.id;
                const unavailableName = normalizeAttackTargetName(rally.targetName, target.id) || `Player ${target.id}`;
                logCallerEvent({
                    eventId: unavailableKey,
                    type: "rally-unavailable",
                    rallyId: String(rally.id || ""),
                    assistance: true,
                    scope: rally.scope,
                    warId: state.warId || detectWarId(),
                    targetId: target.id,
                    targetName: unavailableName,
                    targetBsp: cleanWarTableText(rally.targetBsp || bspValueForId(target.id, null) || ""),
                    result: "hospital",
                    message: `${unavailableName} is in hospital`,
                    attackUrl: location.href,
                    source: `emu-war-caller-pda:${source || "page"}`
                });
                return;
            }
            if (/start\s+fight/i.test(text) && Number(state.attackCompleteTargetId) === Number(target.id)) {
                state.attackCompleteTargetId = null;
                state.attackCompleteCallReleasedTargetId = null;
            }
            return;
        }
        if (Number(state.attackCompleteTargetId) === Number(target.id)) {
            if (ownsAttackCall(target.id)) void releaseOwnCallAfterAttack(target.id);
            return;
        }
        state.attackCompleteTargetId = target.id;
        if (ownsAttackCall(target.id)) {
            state.attackCompleteCallReleasedTargetId = target.id;
            void releaseOwnCallAfterAttack(target.id);
        } else {
            state.attackCompleteCallReleasedTargetId = null;
        }
        if (!rally) {
            renderAttackPageHint();
            return;
        }
        const respect = (text.match(/respect[^\d+-]{0,16}([+-]?\d+(?:\.\d+)?)/i) || [])[1] || "";
        const targetName = normalizeAttackTargetName(rally.targetName, target.id)
            || normalizeAttackTargetName(target.name, target.id)
            || `Player ${target.id}`;
        const targetBsp = cleanWarTableText(rally.targetBsp || bspValueForId(target.id, null) || "");
        const eventKey = `${rally.id || target.id}:${target.id}:${location.pathname}`;
        if (state.lastFightEventKey === eventKey) return;
        state.lastFightEventKey = eventKey;
        logCallerEvent({
            eventId: `fight:${eventKey}`,
            type: "fight-finished",
            rallyId: String(rally.id || ""),
            assistance: true,
            scope: rally.scope,
            warId: state.warId || detectWarId(),
            targetId: target.id,
            targetName,
            targetBsp,
            result,
            respect,
            message: `Fight ${result} vs ${targetName}`,
            attackUrl: location.href,
            source: `emu-war-caller-pda:${source || "page"}`
        });
    }

    function isOwnFactionRoute() {
        if (!/\/factions\.php$/i.test(location.pathname || "")) return false;
        let params;
        try {
            params = new URL(location.href).searchParams;
        } catch (err) {
            params = new URLSearchParams(location.search || "");
        }
        const step = String(params.get("step") || "").toLowerCase();
        const viewedFactionId = Number(params.get("ID") || params.get("id") || 0);
        const factionId = Number(state.faction?.id || state.faction?.faction_id || 0);
        if (viewedFactionId) return Boolean(factionId && viewedFactionId === factionId);
        return step === "your" || Boolean(findTornChainSnapshot());
    }

    function isForeignActiveRankedWarPage() {
        if (state.sleeping || isFinishedRankedWarReportPage() || !isLikelyWarPage()) return false;
        const path = String(location.pathname || "");
        const ownFactionId = Number(state.faction?.id || state.faction?.faction_id || 0);
        const ownFactionName = cleanWarTableText(state.faction?.name || "").toLowerCase();
        let params;
        try {
            params = new URL(location.href).searchParams;
        } catch (err) {
            params = new URLSearchParams(location.search || "");
        }
        if (/\/factions\.php$/i.test(path)) {
            const viewedFactionId = Number(params.get("ID") || params.get("id") || 0);
            if (viewedFactionId && ownFactionId) return viewedFactionId !== ownFactionId;
            // Torn's no-ID and step=your faction routes are authenticated own-faction
            // surfaces. Do not infer foreign ownership from a briefly stale SPA DOM.
            return false;
        }
        if (!/\/war\.php$/i.test(path) || (!ownFactionId && !ownFactionName)) return false;
        const warRoot = document.querySelector(".faction-war");
        if (!(warRoot instanceof HTMLElement)) return false;
        const visibleFactionIds = new Set();
        warRoot.querySelectorAll("a[href*='factions.php'],a[href*='/factions/'],[data-faction-id],[data-factionid]").forEach(node => {
            const raw = String(node.getAttribute("href") || node.getAttribute("data-faction-id") || node.getAttribute("data-factionid") || "");
            const match = raw.match(/[?&](?:ID|id|factionID|factionId|faction_id)=(\d+)/i) || raw.match(/\/factions\/(\d+)/i) || raw.match(/^(\d+)$/);
            if (match) visibleFactionIds.add(Number(match[1]));
        });
        if (ownFactionId && visibleFactionIds.size >= 2) return !visibleFactionIds.has(ownFactionId);
        const identityText = Array.from(warRoot.querySelectorAll("h1,h2,h3,h4,h5,[class*='factionName'],[class*='faction-name'],[class*='war-title'],[class*='title']"))
            .slice(0, 30)
            .map(node => cleanWarTableText(node.textContent || ""))
            .join(" ")
            .toLowerCase();
        return Boolean(ownFactionName && /\bvs\.?\b/i.test(identityText) && !identityText.includes(ownFactionName));
    }

    function callerIdentityBootstrapPending() {
        const path = String(location.pathname || "");
        if (!/\/factions\.php$/i.test(path)) return false;
        const hasFactionIdentity = Boolean(
            Number(state.faction?.id || state.faction?.faction_id || 0)
            || cleanWarTableText(state.faction?.name || "")
        );
        if (hasFactionIdentity) return false;
        let params;
        try {
            params = new URL(location.href).searchParams;
        } catch (err) {
            params = new URLSearchParams(location.search || "");
        }
        const viewedFactionId = Number(params.get("ID") || params.get("id") || 0);
        if (!viewedFactionId) return false;
        const routeKey = `${path.toLowerCase()}?id=${viewedFactionId}`;
        if (state.identityBootstrapRoute !== routeKey) {
            state.identityBootstrapRoute = routeKey;
            state.identityBootstrapAttempted = false;
        }
        return !state.identityBootstrapAttempted;
    }

    function isOwnCallerRuntimeSurface() {
        if (state.sleeping || isFinishedRankedWarReportPage()) return false;
        if (isAttackPage()) return false;
        const path = String(location.pathname || "");
        if (/\/factions\.php$/i.test(path)) {
            // An explicit faction ID cannot be classified on a cold install until the
            // authenticated state response supplies the user's own faction identity.
            // Permit exactly one bootstrap request, then split into own caller or
            // foreign BSP-only mode without retaining a poller on the foreign page.
            if (callerIdentityBootstrapPending()) return true;
            return isCallerInlineFactionRoute() && !isForeignActiveRankedWarPage();
        }
        // A war.php surface without enough identity data gets one auth bootstrap.
        // Once faction identity is known, positive foreign evidence stops polling.
        if (/\/war\.php$/i.test(path)) return !isForeignActiveRankedWarPage();
        return false;
    }

    function updateWarTableOwnershipMarker() {
        // Emu Enhancer uses this marker as its war-table interlock. The Caller owns
        // full rendering on the authenticated faction war and owns only the BSP
        // badge lane on a positively identified foreign active war; either mode must
        // block Enhancer from mounting a second competing runtime onto that roster.
        const handlesActiveWarTable = !state.sleeping
            && !isFinishedRankedWarReportPage()
            && (isOwnWarPage() || isForeignActiveRankedWarPage());
        if (handlesActiveWarTable) document.documentElement.setAttribute("data-emu-caller-owns-war-table", "true");
        else document.documentElement.removeAttribute("data-emu-caller-owns-war-table");
    }

    function isOwnWarPage() {
        if (!/factions\.php|war\.php/i.test(location.href)) return false;
        if (!isLikelyWarPage()) return false;
        if (isOwnFactionRoute()) return true;
        const factionId = Number(state.faction?.id || state.faction?.faction_id || 0);
        const factionName = String(state.faction?.name || "").trim();
        if (!factionId && !factionName) return false;
        let params;
        try {
            params = new URL(location.href).searchParams;
        } catch (err) {
            params = new URLSearchParams(location.search || "");
        }
        const step = String(params.get("step") || "").toLowerCase();
        const viewedFactionId = Number(params.get("ID") || params.get("id") || 0);
        if (/\/factions\.php$/i.test(location.pathname || "")) {
            if (viewedFactionId && factionId && viewedFactionId !== factionId) return false;
            if (step === "your") return true;
            if (viewedFactionId) return Boolean(factionId && viewedFactionId === factionId);
            // Torn's normal own-faction ranked-war route is often a bare
            // /factions.php#/war/rank URL. Once identity is known and there is no
            // positive foreign evidence, it is the caller-owned surface.
            return !step && !isForeignActiveRankedWarPage();
        }
        const warText = Array.from(document.querySelectorAll(".faction-war h1,.faction-war h2,.faction-war h3,.faction-war h4,.faction-war h5,.faction-war [class*='factionName'],.faction-war [class*='faction-name']"))
            .slice(0, 20)
            .map(node => node.textContent || "")
            .join(" ")
            .toLowerCase();
        return Boolean(factionName) && warText.includes(factionName.toLowerCase());
    }

    function isAttackPage() {
        const path = location.pathname || "";
        const search = location.search || "";
        const params = new URLSearchParams(search);
        return /\/attack\.php$/i.test(path)
            || ((/\/loader\.php$/i.test(path) || /\/page\.php$/i.test(path)) && params.get("sid") === "attack")
            || /[?&]sid=attack\b/i.test(search);
    }

    function isMessagesPage() {
        return /\/messages\.php$/i.test(String(location.pathname || ""));
    }

    function isActivityLogPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "log";
        } catch (err) {
            return /[?&]sid=log(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isAttackLogPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "attacklog";
        } catch (err) {
            return /[?&]sid=attacklog(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isOverseasTravelPage() {
        if (/\/travelagency\.php$/i.test(String(location.pathname || ""))) return true;
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "travel";
        } catch (err) {
            return /[?&]sid=travel(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isItemMarketPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "itemmarket";
        } catch (err) {
            return /[?&]sid=itemmarket(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isStockMarketPage() {
        const path = String(location.pathname || "");
        if (/\/stockexchange\.php$/i.test(path)) return true;
        if (!/\/(?:page|loader)\.php$/i.test(path)) return false;
        try {
            const sid = String(new URL(location.href).searchParams.get("sid") || "").toLowerCase();
            return ["stocks", "stockmarket", "stockexchange"].includes(sid);
        } catch (err) {
            return /[?&]sid=(?:stocks|stockmarket|stockexchange)(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isCrimesPage() {
        const path = String(location.pathname || "");
        if (/\/crimes\.php$/i.test(path)) return true;
        if (!/\/(?:page|loader)\.php$/i.test(path)) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "crimes";
        } catch (err) {
            return /[?&]sid=crimes(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isEventsPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "events";
        } catch (err) {
            return /[?&]sid=events(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isCalendarPage() {
        const path = String(location.pathname || "");
        if (/\/calendar\.php$/i.test(path)) return true;
        if (!/\/(?:page|loader)\.php$/i.test(path)) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "calendar";
        } catch (err) {
            return /[?&]sid=calendar(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isBazaarPage() {
        const path = String(location.pathname || "");
        if (/\/bazaar\.php$/i.test(path)) return true;
        if (!/\/(?:page|loader)\.php$/i.test(path)) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "bazaar";
        } catch (err) {
            return /[?&]sid=bazaar(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isAmmoPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            return String(new URL(location.href).searchParams.get("sid") || "").toLowerCase() === "ammo";
        } catch (err) {
            return /[?&]sid=ammo(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isFactionWarfareChainsPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            const url = new URL(location.href);
            return String(url.searchParams.get("sid") || "").toLowerCase() === "factionwarfare"
                && /^#\/?chains(?:[/?&]|$)/i.test(String(url.hash || ""));
        } catch (err) {
            return /[?&]sid=factionWarfare(?:&|$)/i.test(String(location.search || ""))
                && /^#\/?chains(?:[/?&]|$)/i.test(String(location.hash || ""));
        }
    }

    function isFactionWarfareRankedPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            const url = new URL(location.href);
            return String(url.searchParams.get("sid") || "").toLowerCase() === "factionwarfare"
                && /^#\/?ranked(?:[/?&]|$)/i.test(String(url.hash || ""));
        } catch (err) {
            return /[?&]sid=factionWarfare(?:&|$)/i.test(String(location.search || ""))
                && /^#\/?ranked(?:[/?&]|$)/i.test(String(location.hash || ""));
        }
    }

    function isCallerSocialListPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            const url = new URL(location.href);
            return String(url.searchParams.get("sid") || "").toLowerCase() === "list"
                && ["friends", "enemies", "targets"].includes(String(url.searchParams.get("type") || "").toLowerCase());
        } catch (err) {
            return /[?&]sid=list(?:&|$)/i.test(String(location.search || ""))
                && /[?&]type=(?:friends|enemies|targets)(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isCompactCasinoOrPointsPage() {
        if (!/\/(?:page|loader)\.php$/i.test(String(location.pathname || ""))) return false;
        try {
            const sid = String(new URL(location.href).searchParams.get("sid") || "").toLowerCase();
            return ["points", "bookie", "russianroulette", "holdem", "racing"].includes(sid);
        } catch (err) {
            return /[?&]sid=(?:points|bookie|russianroulette|holdem|racing)(?:&|$)/i.test(String(location.search || ""));
        }
    }

    function isNarrowAwardsLauncherPage() {
        const route = `${String(location.pathname || "")}${String(location.search || "")}${String(location.hash || "")}`.toLowerCase();
        const awardsPage = /\/awards\.php(?:$|[?#])/i.test(route) || /(?:[?&#](?:sid|step)=awards)(?:&|$)/i.test(route);
        if (!awardsPage || Number(navigator.maxTouchPoints || 0) < 1) return false;
        const widths = [
            Number(window.visualViewport?.width || 0),
            Number(window.innerWidth || 0),
            Number(window.screen?.width || 0),
            Number(window.screen?.availWidth || 0)
        ].filter(width => Number.isFinite(width) && width > 0);
        return widths.length > 0 && Math.min(...widths) <= 520;
    }

    function isCompactCallerLauncherPage() {
        const compactUtilityPage = isMessagesPage() || isActivityLogPage() || isAttackLogPage() || isOverseasTravelPage() || isItemMarketPage() || isStockMarketPage() || isCrimesPage() || isBazaarPage() || isAmmoPage() || isFactionWarfareChainsPage() || isFactionWarfareRankedPage() || isEventsPage() || isCalendarPage() || isHallOfFameBspPage() || isCallerSocialListPage() || isCompactCasinoOrPointsPage();
        return compactUtilityPage || isNarrowAwardsLauncherPage();
    }

    function isLikelyWarPage() {
        if (/\/factions\.php$/i.test(location.pathname || "")) {
            let route = String(location.hash || "").toLowerCase();
            try {
                route = decodeURIComponent(route);
            } catch (err) {
                // Keep the undecoded route.
            }
            if (!route.includes("/war/rank")) return false;
        }
        const warRoot = document.querySelector(".faction-war");
        if (warRoot?.querySelector(".members-list")) return true;
        const headingText = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,[class*='title']"))
            .slice(0, 40)
            .map(node => node.textContent || "")
            .join(" ")
            .toLowerCase();
        return headingText.includes("ranked war") || headingText.includes("lead target") || headingText.includes("war score");
    }

    function detectWarId() {
        const factionId = state.faction?.id || state.faction?.faction_id || "";
        return `${factionId || "emu"}:active-war`;
    }

    function findRow(node) {
        const element = node instanceof HTMLElement ? node : node?.parentElement;
        if (!element) return null;
        const nativeRow = element.closest(".table-row, li.enemy, li.your, [class*='table-row'], [class*='member-row']");
        if (nativeRow && nativeRow.querySelector("a[href*='profiles.php'], a[href^='/profiles']")) return nativeRow;
        const list = element.closest(".members-list");
        let current = element.parentElement;
        while (current && current !== list && current !== document.body) {
            if (current.matches("li, tr") && current.querySelector("a[href*='profiles.php'], a[href^='/profiles']")) return current;
            current = current.parentElement;
        }
        return null;
    }

    function nearestProfileLink(row) {
        const links = Array.from(row.querySelectorAll("a[href*='profiles.php']"))
            .filter(link => !link.matches("[data-emu-caller-native='true'],.emu-caller-readable-name") && !link.closest("[data-emu-caller-native='true']"));
        return links.find(link => extractPlayerId(link.href)) || null;
    }

    function nativeWarProfileLink(row) {
        if (!(row instanceof HTMLElement)) return null;
        return Array.from(row.querySelectorAll("a[href*='profiles.php'],a[href^='/profiles']"))
            .find(link => !link.matches("[data-emu-caller-native='true'],.emu-caller-readable-name") && !link.closest("[data-emu-caller-native='true']")) || null;
    }

    function mountedWarRowMatchesTarget(target) {
        const row = target?.row;
        const targetId = Number(target?.id || 0);
        if (!(row instanceof HTMLElement) || !targetId) return false;
        const boundId = Number(row.dataset.emuCallerNativePlayerId || 0);
        const liveId = Number(warRowPlayerId(row, nativeWarProfileLink(row)) || 0);
        return boundId === targetId && liveId === targetId;
    }

    function clearStaleWarCallMount(row) {
        if (!(row instanceof HTMLElement)) return;
        row.querySelectorAll(".emu-caller-row-tools,.emu-caller-name-pin").forEach(node => node.remove());
        row.classList.remove("emu-caller-called-row", "emu-caller-own-called-row", "emu-caller-other-called-row", "emu-caller-pinned-row");
    }

    function rebuildTargetMetaIndex() {
        const next = new Map();
        const seen = new WeakSet();
        let visited = 0;

        const walk = (value, hintedId, depth) => {
            if (!value || typeof value !== "object" || depth > 8 || visited > 6000) return;
            if (seen.has(value)) return;
            seen.add(value);
            visited += 1;

            if (Array.isArray(value)) {
                value.slice(0, 500).forEach(item => walk(item, hintedId, depth + 1));
                return;
            }

            const ownId = hintedId || extractMetaPlayerId(value);
            if (ownId) mergeTargetMeta(next, ownId, value);

            Object.entries(value).forEach(([key, child]) => {
                const keyId = /^\d{3,10}$/.test(key) ? Number(key) : null;
                if (keyId && child && typeof child === "object") mergeTargetMeta(next, keyId, child);
                walk(child, keyId || ownId || hintedId, depth + 1);
            });
        };

        Object.values(state.pageData || {}).forEach(payload => walk(payload, null, 0));
        state.targetMeta = next;
        state.targetMetaRevision += 1;
    }

    function extractMetaPlayerId(obj) {
        if (!obj || typeof obj !== "object" || !looksLikePlayerMeta(obj)) return null;
        const fields = ["player_id", "playerId", "target_id", "targetId", "user_id", "userId", "userID", "XID", "xid", "uid", "id"];
        for (const field of fields) {
            const id = Number(obj[field]);
            if (Number.isFinite(id) && id >= 100 && id <= 9999999999) return id;
        }
        return null;
    }

    function looksLikePlayerMeta(obj) {
        const keys = Object.keys(obj || {}).join(" ").toLowerCase();
        return /player|user|target|name|status|state|score|level|life|last[_-]?action|hospital|travel|destination|fair|energy|cooldown|drug|booster|medical|med/.test(keys);
    }

    function mergeTargetMeta(map, id, obj) {
        id = Number(id);
        if (!Number.isFinite(id) || id < 100) return;
        const existing = map.get(id) || {};
        const next = { ...existing };
        const name = pickMetaValue(obj, ["name", "player_name", "playerName", "userName", "username"]);
        const estimate = formatStatEstimate(pickDeepMetaValue(obj, [
            "battlestats", "battle_stats", "battleStats", "estimatedStats", "estimated_stats",
            "statsEstimate", "statEstimate", "bsEstimate", "tbs", "bsp", "bs"
        ]));
        const score = pickScoreValue(obj);
        const status = extractMetaStatus(obj);
        const hospitalUntil = extractHospitalUntil(obj);
        const travelLabel = extractTravelLabel(obj);
        const travelUntil = extractTravelUntil(obj);
        const lastAction = extractLastActionLabel(obj);
        const activity = extractActivityState(obj);
        const energy = extractEnergyLabel(obj);
        const drugCooldown = extractCooldownLabel(obj, ["drugCooldown", "drug_cooldown", "drug_cd", "drug", "drugs", "cooldown_drug", "cooldownDrug"]);
        const boosterCooldown = extractCooldownLabel(obj, ["boosterCooldown", "booster_cooldown", "booster_cd", "booster", "boosters", "cooldown_booster", "cooldownBooster"]);
        const medicalCooldown = extractCooldownLabel(obj, ["medicalCooldown", "medical_cooldown", "medCooldown", "med_cooldown", "medical_cd", "med_cd", "medical", "med"]);
        const telemetry = obj?.telemetry && typeof obj.telemetry === "object" ? obj.telemetry : null;
        const telemetryEnergy = telemetry ? extractEnergyLabel(telemetry) : "";
        const drugCooldownUntil = Number(telemetry?.drug_until || telemetry?.drugUntil || 0);
        const boosterCooldownUntil = Number(telemetry?.booster_until || telemetry?.boosterUntil || 0);
        const medicalCooldownUntil = Number(telemetry?.medical_until || telemetry?.medicalUntil || 0);
        const drugCooldownSeconds = telemetry ? Number(telemetry.drug_cooldown ?? telemetry.drugCooldown) : NaN;
        const boosterCooldownSeconds = telemetry ? Number(telemetry.booster_cooldown ?? telemetry.boosterCooldown) : NaN;
        const medicalCooldownSeconds = telemetry ? Number(telemetry.medical_cooldown ?? telemetry.medicalCooldown) : NaN;
        const revivable = extractRevivable(obj);

        if (name) next.name = String(name);
        if (estimate) next.estimate = estimate;
        if (score) next.score = score;
        if (status) next.status = status;
        if (hospitalUntil) next.hospitalUntil = hospitalUntil;
        if (travelLabel) next.travelLabel = travelLabel;
        if (travelUntil) next.travelUntil = travelUntil;
        if (lastAction) next.lastAction = lastAction;
        if (activity) next.activity = activity;
        if (telemetryEnergy || energy) next.energy = telemetryEnergy || energy;
        if (drugCooldown) next.drugCooldown = drugCooldown;
        if (boosterCooldown) next.boosterCooldown = boosterCooldown;
        if (medicalCooldown) next.medicalCooldown = medicalCooldown;
        if (drugCooldownUntil > 0) next.drugCooldownUntil = drugCooldownUntil;
        if (boosterCooldownUntil > 0) next.boosterCooldownUntil = boosterCooldownUntil;
        if (medicalCooldownUntil > 0) next.medicalCooldownUntil = medicalCooldownUntil;
        if (Number.isFinite(drugCooldownSeconds)) next.drugCooldownReady = drugCooldownSeconds === 0;
        if (Number.isFinite(boosterCooldownSeconds)) next.boosterCooldownReady = boosterCooldownSeconds === 0;
        if (Number.isFinite(medicalCooldownSeconds)) next.medicalCooldownReady = medicalCooldownSeconds === 0;
        if (typeof revivable === "boolean") next.revivable = revivable;
        if (Object.keys(next).length) map.set(id, next);
    }

    function extractRevivable(obj) {
        const direct = pickMetaValue(obj, ["revivable", "is_revivable", "isRevivable", "revive_enabled", "reviveEnabled", "revive_setting", "reviveSetting"]);
        if (direct !== "") return parseBooleanState(direct);
        for (const key of ["profile", "member", "user", "settings", "status"]) {
            const nested = obj?.[key];
            if (!nested || typeof nested !== "object") continue;
            const value = pickMetaValue(nested, ["revivable", "is_revivable", "isRevivable", "revive_enabled", "reviveEnabled"]);
            if (value !== "") return parseBooleanState(value);
        }
        return null;
    }

    function extractLastActionLabel(obj) {
        const raw = obj?.last_action ?? obj?.lastAction ?? obj?.last_action_timestamp ?? obj?.lastActionTimestamp ?? obj?.last_seen ?? obj?.lastSeen;
        if (raw && typeof raw === "object") {
            const relative = pickMetaValue(raw, ["relative", "status", "text", "description"]);
            if (relative) return compactLastAction(relative);
            const timestamp = Number(pickMetaValue(raw, ["timestamp", "time", "at"]));
            if (timestamp > 1000000000) return compactLastAction(timeAgo(timestamp));
        }
        if (Number(raw) > 1000000000) return compactLastAction(timeAgo(Number(raw)));
        return raw ? compactLastAction(raw) : "";
    }

    function normalizeActivityState(value) {
        const text = String(value || "").toLowerCase();
        if (/\boffline\b/.test(text)) return "offline";
        if (/\bidle\b/.test(text)) return "idle";
        if (/\bonline\b/.test(text)) return "online";
        return "";
    }

    function extractActivityState(obj) {
        const lastAction = obj?.last_action || obj?.lastAction;
        if (lastAction && typeof lastAction === "object") {
            const nested = normalizeActivityState(pickMetaValue(lastAction, ["status", "state"]));
            if (nested) return nested;
        }
        return normalizeActivityState(pickMetaValue(obj, [
            "activity", "activity_status", "activityStatus", "online_status", "onlineStatus",
            "last_action_status", "lastActionStatus", "status", "state"
        ]));
    }

    function activityStateForMember(meta, row) {
        const saved = normalizeActivityState(meta?.activity || meta?.onlineStatus || "");
        if (saved) return saved;
        const nativeNode = row?.querySelector?.(".online,.idle,.offline,[class*='online___'],[class*='idle___'],[class*='offline___']");
        const nativeHint = normalizeActivityState([
            nativeNode?.className,
            nativeNode?.getAttribute?.("title"),
            nativeNode?.getAttribute?.("aria-label"),
            nativeNode?.getAttribute?.("data-status")
        ].filter(Boolean).join(" "));
        if (nativeHint) return nativeHint;
        const age = lastActionAge(meta?.lastAction || nativeLastAction(row));
        if (age !== null && age <= 15 * 60) return "online";
        if (age !== null && age <= 30 * 60) return "idle";
        return "offline";
    }

    function pickMetaValue(obj, keys) {
        for (const key of keys) {
            const value = obj?.[key];
            if (value !== undefined && value !== null && value !== "") return value;
        }
        return "";
    }

    function pickDeepMetaValue(obj, keys) {
        const direct = pickMetaValue(obj, keys);
        if (direct && typeof direct !== "object") return direct;
        if (direct && typeof direct === "object") {
            const nested = pickMetaValue(direct, ["total", "value", "estimate", "amount", "stats"]);
            if (nested) return nested;
        }
        for (const value of Object.values(obj || {})) {
            if (!value || typeof value !== "object" || Array.isArray(value)) continue;
            const found = pickMetaValue(value, keys);
            if (found && typeof found !== "object") return found;
            if (found && typeof found === "object") {
                const nested = pickMetaValue(found, ["total", "value", "estimate", "amount", "stats"]);
                if (nested) return nested;
            }
        }
        return "";
    }

    function pickScoreValue(obj) {
        const value = pickMetaValue(obj, ["war_score", "warScore", "score"]);
        const numeric = Number(String(value).replace(/,/g, ""));
        if (!Number.isFinite(numeric) || numeric < 0 || numeric > 2000) return "";
        return numeric.toFixed(numeric % 1 ? 2 : 0);
    }

    function extractMetaStatus(obj) {
        const direct = pickMetaValue(obj, ["status", "state", "state_text", "stateText"]);
        if (typeof direct === "string") return compactStatusText(direct);
        if (direct && typeof direct === "object") {
            const nested = pickMetaValue(direct, ["description", "state", "status", "name", "text"]);
            if (nested) return compactStatusText(nested);
        }
        const lastAction = obj?.last_action || obj?.lastAction;
        if (lastAction && typeof lastAction === "object") {
            const status = pickMetaValue(lastAction, ["status", "state"]);
            if (status) return compactStatusText(status);
        }
        return "";
    }

    function extractHospitalUntil(obj) {
        const explicit = pickMetaValue(obj, ["hospitalUntil", "hospital_until"]);
        const parsed = parseTimeValue(explicit);
        if (parsed) return parsed;
        const hospital = obj?.hospital;
        if (hospital) {
            const hospitalTime = parseTimeValue(hospital);
            if (hospitalTime) return hospitalTime;
        }
        for (const key of ["hospital", "status", "state"]) {
            const value = obj?.[key];
            if (value && typeof value === "object") {
                const statusText = compactStatusText(pickMetaValue(value, ["description", "state", "status", "name", "text"]), 80);
                if (key !== "hospital" && !/hospital|hosp/i.test(statusText)) continue;
                const nested = parseTimeValue(pickMetaValue(value, ["until", "timestamp", "time_left", "timeLeft", "seconds"]));
                if (nested) return nested;
            }
        }
        return 0;
    }

    function extractTravelLabel(obj) {
        const travel = obj?.travel || obj?.flight || obj?.destination || obj?.location;
        const candidate = travel && typeof travel === "object" ? travel : obj;
        const status = obj?.status && typeof obj.status === "object" ? obj.status : {};
        const statusText = compactStatusText([
            extractMetaStatus(obj),
            pickMetaValue(status, ["description", "details", "state", "status", "name", "text"])
        ].filter(Boolean).join(" "), 100);
        const routeText = compactStatusText(pickMetaValue(status, ["description", "details", "state", "status", "name", "text"]) || extractMetaStatus(obj), 100);
        const dest = pickMetaValue(candidate, ["destination", "country", "location", "to"]);
        const text = typeof travel === "string" ? travel : "";
        const trackedFlight = parseBooleanState(travel?.travelling ?? travel?.traveling ?? travel?.flying) === true;
        if (!trackedFlight && !dest && !/travel|flying|abroad|returning/i.test(`${text} ${statusText}`)) return "";
        const route = callerTravelRoute(text || routeText || String(dest || ""));
        if (route?.kind === "in") return `In ${route.country.label}`;
        if (route?.kind === "return") return `Returning from ${route.country.label}`;
        if (route?.kind === "out") return `Traveling to ${route.country.label}`;
        return compactStatusText(text || dest || statusText || "Traveling");
    }

    function extractTravelUntil(obj) {
        const travel = obj?.travel || obj?.flight || obj?.destination || obj?.location;
        const candidate = travel && typeof travel === "object" ? travel : obj;
        const status = obj?.status && typeof obj.status === "object" ? obj.status : {};
        const statusText = compactStatusText(`${extractMetaStatus(obj)} ${pickMetaValue(status, ["description", "details", "state", "status", "name", "text"])}`, 100);
        const routeText = compactStatusText(pickMetaValue(status, ["description", "details", "state", "status", "name", "text"]) || extractMetaStatus(obj), 100);
        const destination = pickMetaValue(candidate, ["destination", "country", "location", "to"]);
        const trackedFlight = parseBooleanState(travel?.travelling ?? travel?.traveling ?? travel?.flying) === true;
        if (!trackedFlight && !destination && !/travel|flying|abroad|returning/i.test(statusText)) return 0;
        const direct = parseTimeValue(pickMetaValue(candidate, ["arrival", "arrive", "eta", "until", "timestamp", "time_left", "timeLeft", "seconds"]))
            || parseTimeValue(pickMetaValue(status, ["until", "arrival", "arrive", "eta", "timestamp", "time_left", "timeLeft", "seconds"]));
        if (direct) return direct;
        const route = callerTravelRoute(routeText || String(destination || ""));
        const sinceRaw = Number(travel?.since_ms || travel?.sinceMs || obj?.emu_travel_since || 0);
        const sinceMs = sinceRaw > 100000000000 ? sinceRaw : sinceRaw > 1000000000 ? sinceRaw * 1000 : 0;
        if (!trackedFlight || !sinceMs || !route || route.kind === "in" || !route.country.airstrip) return 0;
        const until = Math.floor((sinceMs + route.country.airstrip * 60 * 1000) / 1000);
        return until > Math.floor(Date.now() / 1000) ? until : 0;
    }

    function callerHospitalCountry(value) {
        const normalized = String(value || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
        if (!normalized) return null;
        return callerTravelCountry(HOSPITAL_COUNTRY_ALIASES[normalized] || normalized);
    }

    function callerTravelRoute(description) {
        const text = String(description || "").replace(/\s+/g, " ").trim();
        if (!text) return null;
        let match = text.match(/\bIn\s+(?:an?\s+)?(.+?)\s+hospital\b/i);
        if (match) {
            const country = callerHospitalCountry(match[1]);
            if (country && country.label !== "TC") return { kind: "in", country };
        }
        match = text.match(/^Traveling from (.+?) to (.+)$/i);
        if (match) {
            const from = callerTravelCountry(match[1]);
            const to = callerTravelCountry(match[2]);
            if (to?.label === "TC" && from) return { kind: "return", country: from };
            if (to) return { kind: "out", country: to };
        }
        match = text.match(/^(?:Traveling to|To) (.+)$/i);
        if (match) {
            const country = callerTravelCountry(match[1]);
            if (country) return { kind: country.label === "TC" ? "return" : "out", country };
        }
        match = text.match(/^(?:Returning from|Traveling back from|From) (.+)$/i);
        if (match) {
            const country = callerTravelCountry(match[1]);
            if (country) return { kind: "return", country };
        }
        match = text.match(/^(?:In|Overseas in|Abroad in)(?: the)? (.+)$/i);
        if (match) {
            const country = callerTravelCountry(match[1]);
            if (country) return { kind: "in", country };
        }
        const country = callerTravelCountry(text);
        if (country) return { kind: country.label === "TC" ? "return" : "in", country };
        return null;
    }

    function travelRouteForMeta(meta = {}) {
        const values = [meta.travelLabel, meta.status?.description, meta.status?.details, meta.status]
            .map(value => typeof value === "string" ? compactStatusText(value, 100) : "")
            .filter(Boolean);
        for (const value of values) {
            const route = callerTravelRoute(value);
            if (route) return route;
        }
        return null;
    }

    function overseasRouteForMeta(meta = {}) {
        const route = travelRouteForMeta(meta);
        return route?.kind === "in" && route?.country?.label && route.country.label !== "TC" ? route : null;
    }

    function compactTravelCountryStatus(meta = {}, fallbackValue = "") {
        const route = travelRouteForMeta(meta) || callerTravelRoute(fallbackValue);
        const country = compactStatusText(route?.country?.label || "", 8);
        if (!country) return "";
        if (route.kind === "return") return "TORN";
        return country;
    }

    function callerTravelCountry(value) {
        const normalized = String(value || "").toLowerCase().replace(/\bthe\b/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
        if (!normalized) return null;
        if (TRAVEL_COUNTRY_TIMES[normalized]) return TRAVEL_COUNTRY_TIMES[normalized];
        for (const data of Object.values(TRAVEL_COUNTRY_TIMES)) {
            const label = String(data.label || "").toLowerCase();
            const place = String(data.place || "").toLowerCase();
            if (normalized === label || (place && normalized === place)) return data;
        }
        if (normalized.length < 4) return null;
        for (const [name, data] of Object.entries(TRAVEL_COUNTRY_TIMES)) {
            if (normalized.includes(name) || name.includes(normalized)) return data;
        }
        return null;
    }

    function extractEnergyLabel(obj) {
        const nested = obj?.energy;
        if (nested && typeof nested === "object") {
            const current = pickMetaValue(nested, ["current", "value", "amount", "now"]);
            const maximum = pickMetaValue(nested, ["maximum", "max", "full", "total"]);
            if (current && maximum) return `${current}/${maximum}`.replace(/\s+/g, "");
            if (current && typeof current !== "object") return String(current).replace(/\s+/g, "");
        }
        const current = pickMetaValue(obj, ["energy_current", "energyCurrent", "currentEnergy", "energy"]);
        const maximum = pickMetaValue(obj, ["energy_max", "energyMax", "maxEnergy", "max_energy"]);
        if (current && maximum && typeof current !== "object") return `${current}/${maximum}`.replace(/\s+/g, "");
        if (current && typeof current !== "object" && /^\d{1,4}(?:\s*\/\s*\d{1,4})?$/.test(String(current).trim())) return String(current).replace(/\s+/g, "");
        return "";
    }

    function extractCooldownLabel(obj, keys) {
        return normalizeTimerLabel(pickDeepMetaValue(obj, keys));
    }

    function parseTimeValue(value) {
        if (!value) return 0;
        if (typeof value === "object") value = pickMetaValue(value, ["timestamp", "until", "seconds", "time_left", "timeLeft"]);
        const numeric = Number(String(value).replace(/,/g, ""));
        if (!Number.isFinite(numeric) || numeric <= 0) return 0;
        const now = Math.floor(Date.now() / 1000);
        if (numeric > now - 3600) return Math.floor(numeric);
        if (numeric < 7 * 24 * 60 * 60) return now + Math.floor(numeric);
        return 0;
    }

    function statusFromTargetMeta(id) {
        const meta = warStatusMetaFor(id, state.targetMeta.get(Number(id)) || {});
        if (!meta) return "";
        const now = Date.now() / 1000;
        if (meta.hospitalUntil && meta.hospitalUntil > now) return `Hosp ${formatRemainingSeconds(meta.hospitalUntil - now)}`;
        if (meta.travelLabel) return meta.travelLabel;
        return /\b(?:online|offline|idle)\b/i.test(meta.status || "") ? "" : meta.status || "";
    }

    function compactStatusText(value, limit = 32) {
        return String(value || "")
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, limit);
    }

    function formatRemainingSeconds(seconds) {
        seconds = Math.max(0, Math.floor(Number(seconds) || 0));
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (days) return `${days}d ${hours}h`;
        if (hours) return `${hours}h ${minutes}m`;
        if (minutes) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    }

    function formatStatEstimate(value) {
        if (value === undefined || value === null || value === "") return "";
        if (typeof value === "object") value = pickMetaValue(value, ["total", "value", "estimate", "amount", "stats"]);
        const text = String(value).trim();
        const labelled = text.match(/[<>]?\s*\d+(?:\.\d+)?\s*(?:k|m|b|t|q)\b/i);
        if (labelled) return labelled[0].replace(/\s+/g, "");
        const numeric = Number(text.replace(/,/g, ""));
        if (!Number.isFinite(numeric) || numeric <= 0) return "";
        const units = [
            [1e15, "q"],
            [1e12, "t"],
            [1e9, "b"],
            [1e6, "m"],
            [1e3, "k"]
        ];
        for (const [size, suffix] of units) {
            if (numeric >= size) {
                const scaled = numeric / size;
                return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${suffix}`;
            }
        }
        return String(Math.round(numeric));
    }

    function rowStatus(row) {
        const text = cleanWarTableText(row?.textContent || "");
        const time = text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)?.[0] || text.match(/\b\d+\s*(?:d|h|m|s)\b/i)?.[0] || "";
        if (/\b(?:hospital|hosp)\b/i.test(text)) return time ? `Hosp ${time}` : "Hospital";
        if (/\bjail(?:ed)?\b/i.test(text)) return time ? `Jail ${time}` : "Jail";
        if (/\babroad\b/i.test(text)) return "Abroad";
        if (/\b(?:traveling|travelling|flying|returning)\b/i.test(text)) {
            const dest = text.match(/\b(?:Mexico|Cayman(?: Islands)?|Canada|Hawaii|United Kingdom|UK|Argentina|Switzerland|Japan|China|UAE|South Africa|Torn)\b/i)?.[0] || "";
            const eta = text.match(/\bETA[:\s-]*([0-9dhms: ]{2,16})/i)?.[1]?.trim() || time;
            return `${dest ? `${dest} ` : ""}${eta ? `ETA ${eta}` : "Traveling"}`.trim();
        }
        const status = text.match(/\b(Okay)\b/i);
        return status ? status[0] : "";
    }

    function extractBattleEstimate(row) {
        const text = compactText(row?.innerText || "");
        const labelled = text.match(/\b(?:TBS|BSP|BS|Stats(?: Estimate)?):?\s*([<>]?\s*\d+(?:\.\d+)?\s*(?:k|m|b|t|q)?)/i);
        if (labelled) return labelled[1].replace(/\s+/g, "");
        const badges = Array.from(row?.querySelectorAll?.("[class*='bsp'], [class*='emu-war-bsp'], [data-emu-bsp], [data-bsp]") || []);
        for (const badge of badges) {
            const found = compactText(badge.textContent || "").match(/[<>]?\s*\d+(?:\.\d+)?\s*(?:k|m|b|t|q)\b/i);
            if (found) return found[0].replace(/\s+/g, "");
        }
        const compact = text.match(/\b\d+(?:\.\d+)?\s*(?:m|b|t|q)\b/i);
        return compact ? compact[0].replace(/\s+/g, "") : "--";
    }

    function extractWarScore(row) {
        const text = compactText(row?.innerText || "");
        const labelled = text.match(/\b(?:score|war score):?\s*([+-]?\d{1,5}(?:\.\d{1,2})?)/i);
        if (labelled) return labelled[1];
        const nums = text.match(/\b\d{1,4}(?:\.\d{1,2})\b/g) || [];
        const score = nums.find(value => Number(value) > 0 && Number(value) < 2000);
        return score || "0.00";
    }

    function compactText(value) {
        const text = value instanceof Element ? value.textContent : value;
        return String(text || "").replace(/\s+/g, " ").trim();
    }

    function cleanWarTableText(value) {
        return String(value ?? "")
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
            .replace(/[\u200B-\u200D\u2060\uFEFF\uFFFC\uFFFD]/g, " ")
            .replace(/[\u25A0-\u25FF]/g, " ")
            .replace(/(?:\u00e2|\u00c3|\u00c2)(?:[\u0080-\u00BF]|[^\p{L}\p{N}\s])+/gu, " ")
            .replace(/(?:^|\s)[\u00e2\u00c3\u00c2](?=\s|$)/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function cleanLevelValue(value) {
        const match = cleanWarTableText(value).match(/\b(100|[1-9]?\d)\b/);
        return match ? match[1] : "--";
    }

    function extractPlayerId(text) {
        const match = String(text || "").match(/[?&](?:XID|user2ID|ID)=?(\d{3,10})|profiles\.php\?XID=(\d{3,10})|\/profiles\.php.*?(\d{3,10})/i);
        return match ? Number(match[1] || match[2] || match[3]) : null;
    }

    function onlineMembers() {
        if (Array.isArray(state.membersOnline)) return state.membersOnline;
        try {
            const cached = JSON.parse(getValue(STORAGE.lastState, "") || "{}");
            return Array.isArray(cached.membersOnline) ? cached.membersOnline : [];
        } catch (err) {
            return [];
        }
    }

    function apiResponsePayload(value, depth = 0) {
        if (value === null || value === undefined || depth > 3) return null;
        if (typeof value === "string") {
            const text = value.replace(/^\uFEFF/, "").trim();
            if (!text) return null;
            try {
                return JSON.parse(text);
            } catch (err) {
                return null;
            }
        }
        if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
            try {
                return apiResponsePayload(new TextDecoder().decode(value), depth + 1);
            } catch (err) {
                return null;
            }
        }
        if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView?.(value)) {
            try {
                return apiResponsePayload(
                    new TextDecoder().decode(
                        new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
                    ),
                    depth + 1
                );
            } catch (err) {
                return null;
            }
        }
        if (typeof value !== "object") return null;

        const transportKeys = ["responseText", "response", "body"];
        let hasTransportValue = false;
        for (const key of transportKeys) {
            if (!(key in value) || value[key] === value || value[key] === undefined || value[key] === null) continue;
            hasTransportValue = true;
            const parsed = apiResponsePayload(value[key], depth + 1);
            if (parsed !== null) return parsed;
        }
        if (!hasTransportValue && ("status" in value || "statusCode" in value) && "data" in value) {
            hasTransportValue = true;
            const parsed = apiResponsePayload(value.data, depth + 1);
            if (parsed !== null) return parsed;
        }
        return hasTransportValue ? null : value;
    }

    function apiResponseStatus(response) {
        const candidates = [
            response?.status,
            response?.statusCode,
            response?.response?.status,
            response?.response?.statusCode
        ];
        for (const candidate of candidates) {
            const status = Number(candidate);
            if (Number.isFinite(status) && status > 0) return status;
        }
        return 200;
    }

    function apiRequestError(message, status, payload = null) {
        const error = new Error(String(message || `HTTP ${status || 0}`));
        error.status = Number(status || 0);
        if (payload && typeof payload === "object") error.payload = payload;
        return error;
    }

    let preferPdaNativeApi = false;
    let preferBrowserApi = false;

    function pdaNativeApiRequest(path, body, method, apiKeyOverride) {
        return (async () => {
            const requestMethod = String(method || (body ? "POST" : "GET")).toUpperCase();
            const pdaWindow = typeof unsafeWindow !== "undefined" && unsafeWindow
                ? unsafeWindow
                : window;
            const handlerNames = {
                GET: "PDA_httpGet",
                POST: "PDA_httpPost",
                PUT: "PDA_httpPut",
                PATCH: "PDA_httpPatch",
                DELETE: "PDA_httpDelete"
            };
            const handler = pdaWindow?.[handlerNames[requestMethod]];
            if (typeof handler !== "function") throw new Error("native TornPDA HTTP bridge unavailable");
            const headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Emu-Api-Key": String(apiKeyOverride || getApiKey() || "").trim()
            };
            let timeoutId = null;
            try {
                const nativeRequest = requestMethod === "GET" || requestMethod === "DELETE"
                    ? handler.call(pdaWindow, `${DASHBOARD_ORIGIN}${path}`, headers)
                    : handler.call(
                        pdaWindow,
                        `${DASHBOARD_ORIGIN}${path}`,
                        headers,
                        body ? JSON.stringify(body) : ""
                    );
                const timeout = new Promise((resolve, reject) => {
                    timeoutId = setTimeout(() => reject(new Error("timeout")), API_TIMEOUT_MS);
                });
                const response = await Promise.race([Promise.resolve(nativeRequest), timeout]);
                const status = apiResponseStatus(response);
                const data = apiResponsePayload(response);
                if (data === null) throw new Error(`Unreadable native TornPDA response (HTTP ${status})`);
                if (status >= 200 && status < 300 && data.ok !== false) return data;
                throw apiRequestError(data.error || data.message || `HTTP ${status}`, status, data);
            } finally {
                if (timeoutId !== null) clearTimeout(timeoutId);
            }
        })();
    }

    function browserApiRequest(path, body, method, apiKeyOverride) {
        return (async () => {
            if (typeof fetch !== "function") throw new Error("browser network fallback unavailable");
            const controller = typeof AbortController === "function" ? new AbortController() : null;
            const timeoutId = controller
                ? setTimeout(() => controller.abort(), API_TIMEOUT_MS)
                : null;
            try {
                const response = await fetch(`${DASHBOARD_ORIGIN}${path}`, {
                    method: method || (body ? "POST" : "GET"),
                    mode: "cors",
                    credentials: "omit",
                    cache: "no-store",
                    redirect: "follow",
                    referrerPolicy: "no-referrer",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "X-Emu-Api-Key": String(apiKeyOverride || getApiKey() || "").trim()
                    },
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller?.signal
                });
                const data = apiResponsePayload(await response.text());
                if (data === null) throw new Error(`Unreadable fallback response (HTTP ${response.status})`);
                if (response.ok && data.ok !== false) return data;
                throw apiRequestError(data.error || data.message || `HTTP ${response.status}`, response.status, data);
            } catch (err) {
                if (err?.name === "AbortError") throw new Error("timeout");
                throw err;
            } finally {
                if (timeoutId !== null) clearTimeout(timeoutId);
            }
        })();
    }

    function apiRequest(path, body, method, apiKeyOverride) {
        if (preferPdaNativeApi) return pdaNativeApiRequest(path, body, method, apiKeyOverride);
        if (preferBrowserApi) return browserApiRequest(path, body, method, apiKeyOverride);
        return new Promise((resolve, reject) => {
            const requestMethod = method || (body ? "POST" : "GET");
            GM_xmlhttpRequest({
                method: requestMethod,
                url: `${DASHBOARD_ORIGIN}${path}`,
                responseType: "text",
                headers: {
                    "Content-Type": "application/json",
                    "X-Emu-Api-Key": String(apiKeyOverride || getApiKey() || "").trim()
                },
                data: body ? JSON.stringify(body) : undefined,
                timeout: API_TIMEOUT_MS,
                onload: response => {
                    const status = apiResponseStatus(response);
                    const data = apiResponsePayload(response);
                    if (data === null) {
                        if (path === "/api/dashboard/auth-check" && status === 200) {
                            resolve({ ok: true, allowed: true, compatibilityStatusOnly: true });
                            return;
                        }
                        const safeToReplay = requestMethod === "GET";
                        if (status >= 200 && status < 300 && safeToReplay) {
                            pdaNativeApiRequest(path, body, requestMethod, apiKeyOverride)
                                .then(result => {
                                    preferPdaNativeApi = true;
                                    resolve(result);
                                })
                                .catch(() => {
                                    browserApiRequest(path, body, requestMethod, apiKeyOverride)
                                        .then(result => {
                                            preferBrowserApi = true;
                                            resolve(result);
                                        })
                                        .catch(err => reject(new Error(
                                            `Unreadable TornPDA response (HTTP ${status}); ${err?.message || "fallback failed"}`
                                        )));
                                });
                            return;
                        }
                        reject(new Error(`Unreadable server response (HTTP ${status})`));
                        return;
                    }
                    if (status >= 200 && status < 300 && data.ok !== false) resolve(data);
                    else reject(apiRequestError(data.error || data.message || `HTTP ${status}`, status, data));
                },
                onerror: () => reject(new Error("network error")),
                ontimeout: () => reject(new Error("timeout"))
            });
        });
    }

    function addStyles() {
        const existing = document.getElementById("emu-control-companion-styles");
        if (
            existing?.dataset.emuCallerStyleVersion === RUNTIME_VERSION &&
            existing.textContent?.length > 1000
        ) return;
        const callerUserAgent = String(navigator.userAgent || "");
        document.documentElement.classList.toggle("emu-caller-android", /Android/i.test(callerUserAgent));
        document.documentElement.classList.toggle("emu-caller-mises-browser", /\bMises\b/i.test(callerUserAgent));
        document.documentElement.classList.toggle("emu-caller-tornpda", isTornPdaRuntime());
        const css = `
      #emu-alliance-chat-root,#emu-family-chat-root { position:fixed!important;right:var(--emu-alliance-chat-right,278px)!important;bottom:var(--emu-alliance-chat-bottom,12px)!important;z-index:999992!important;color:#eaf8f5!important;font:12px/1.35 Arial,sans-serif!important; }
      #emu-alliance-chat-root[hidden],#emu-alliance-chat-root [hidden],#emu-family-chat-root[hidden],#emu-family-chat-root [hidden] { display:none!important; }
      #emu-alliance-chat-root button,#emu-alliance-chat-root input,#emu-family-chat-root button,#emu-family-chat-root input { box-sizing:border-box!important;font:inherit!important; }
      .emu-alliance-chat-launcher { position:relative!important;display:flex!important;align-items:center!important;gap:6px!important;min-width:90px!important;height:42px!important;padding:0 11px!important;border:1px solid #49b9c8!important;border-radius:9px!important;background:linear-gradient(#1c6676,#103b48)!important;box-shadow:0 3px 12px rgba(0,0,0,.55)!important;color:#fff!important;cursor:pointer!important;font-weight:700!important; }
      #emu-alliance-chat-root[data-brand="nameless"] .emu-alliance-chat-launcher { border-color:#ac69ea!important;background:linear-gradient(#7136a3,#35194e)!important; }
      .emu-alliance-chat-launcher svg { width:19px!important;height:19px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important; }
      .emu-alliance-chat-badge { position:absolute!important;top:-7px!important;right:-7px!important;min-width:18px!important;height:18px!important;padding:0 4px!important;border:2px solid #101416!important;border-radius:12px!important;background:#f04e5e!important;color:#fff!important;font:700 10px/14px Arial,sans-serif!important;text-align:center!important; }
      .emu-alliance-chat-badge.is-mention { background:#ff9f1a!important;color:#160b00!important;box-shadow:0 0 0 2px rgba(255,159,26,.25),0 0 10px rgba(255,159,26,.8)!important; }
      #emu-alliance-chat-native-tab { background:linear-gradient(#5a2a86,#2c1440)!important;color:#e2b7ff!important; }
      #emu-family-chat-native-tab { background:linear-gradient(#0e6b4d,#053526)!important;color:#8dffcf!important; }
      #emu-alliance-chat-native-tab:hover:not(.is-active) { filter:brightness(1.18); }
      #emu-family-chat-native-tab:hover:not(.is-active) { filter:brightness(1.18); }
      #emu-alliance-chat-native-tab.is-active { background:linear-gradient(#8a4cc7,#4a2270)!important;color:#fff!important; }
      #emu-family-chat-native-tab.is-active { background:linear-gradient(#1cae7e,#0a5c40)!important;color:#fff!important; }      #emu-alliance-chat-native-tab svg,#emu-family-chat-native-tab svg { display:block!important;width:27px!important;height:27px!important;overflow:visible!important;pointer-events:none!important; }
      #emu-alliance-chat-native-tab:focus,#emu-alliance-chat-native-tab:focus-visible,#emu-family-chat-native-tab:focus,#emu-family-chat-native-tab:focus-visible { outline:none!important; }
      #emu-alliance-chat-native-tab .emu-alliance-chat-badge,#emu-family-chat-native-tab .emu-alliance-chat-badge { top:-5px!important;right:3px!important; }
      .emu-alliance-chat-panel { position:absolute!important;right:0!important;bottom:50px!important;display:grid!important;grid-template-rows:auto auto minmax(130px,1fr) auto!important;width:min(370px,calc(100vw - 24px))!important;height:min(500px,calc(100vh - 100px))!important;overflow:hidden!important;border:1px solid #347581!important;border-radius:10px!important;background:#0d1215!important;box-shadow:0 8px 28px rgba(0,0,0,.7)!important; }
      #emu-alliance-chat-root.is-shortcut-docked .emu-alliance-chat-panel,#emu-family-chat-root.is-shortcut-docked .emu-alliance-chat-panel { position:absolute!important;left:auto!important;top:auto!important;right:0!important;bottom:calc(var(--emu-alliance-chat-shortcut-height,40px) + 6px)!important;width:min(370px,calc(100vw - 16px))!important;height:min(500px,calc(100vh - var(--emu-alliance-chat-shortcut-height,40px) - 26px))!important;box-sizing:border-box!important; }
      #emu-family-chat-root .emu-alliance-chat-panel { border-color:#238b68!important; }
      #emu-family-chat-root .emu-alliance-chat-launcher { border-color:#42d39d!important;background:linear-gradient(#177b5c,#093c2e)!important; }
      #emu-family-chat-root .emu-alliance-chat-meta span { color:#75e9bd!important; }
      #emu-alliance-chat-root[data-brand="nameless"] .emu-alliance-chat-panel { border-color:#704398!important; }
      .emu-alliance-chat-panel>header { display:flex!important;align-items:center!important;justify-content:space-between!important;padding:10px 12px!important;border-bottom:1px solid #25343a!important;background:#172226!important; }
      .emu-alliance-chat-panel header strong,.emu-alliance-chat-panel header small { display:block!important; }
      .emu-alliance-chat-panel header strong { color:#fff!important;font-size:14px!important; }
      .emu-alliance-chat-panel header small { margin-top:1px!important;color:#8ba3a6!important;font-size:10px!important; }
      .emu-alliance-chat-close { width:30px!important;height:30px!important;padding:0!important;border:0!important;background:transparent!important;color:#cde0e1!important;cursor:pointer!important;font-size:24px!important;line-height:28px!important; }
      .emu-alliance-chat-status { min-height:16px!important;padding:5px 10px!important;border-bottom:1px solid #1e2b30!important;color:#74cbd5!important;background:#10191d!important;font-size:10px!important; }
      .emu-alliance-chat-status.is-error { color:#ff9ba4!important; }
      .emu-alliance-chat-messages { overflow-x:hidden!important;overflow-y:auto!important;padding:8px!important;overscroll-behavior:contain!important;scrollbar-width:thin!important; }
      .emu-alliance-chat-message { margin:0 0 7px!important;padding:7px 8px!important;border:1px solid #25343a!important;border-radius:7px!important;background:#151c20!important; }
      .emu-alliance-chat-message.is-own { border-color:#2c6972!important;background:#12262a!important; }
      .emu-alliance-chat-message.is-mentioned { border-color:#ff9f1a!important;background:#2a2012!important;box-shadow:inset 3px 0 #ff9f1a!important; }
      .emu-alliance-chat-new-divider { display:flex!important;align-items:center!important;gap:8px!important;margin:9px 0 8px!important;color:#ff9ba4!important;font:700 10px/1 Arial,sans-serif!important;text-transform:uppercase!important;letter-spacing:.04em!important; }
      .emu-alliance-chat-new-divider::before,.emu-alliance-chat-new-divider::after { content:""!important;flex:1 1 auto!important;height:1px!important;background:#c44f60!important;opacity:.8!important; }
      .emu-alliance-chat-new-divider span { flex:0 0 auto!important; }
      .emu-alliance-chat-meta { display:flex!important;align-items:baseline!important;gap:5px!important;min-width:0!important; }
      .emu-alliance-chat-meta span { color:#72d7df!important;font-weight:700!important; }
      #emu-alliance-chat-root[data-brand="nameless"] .emu-alliance-chat-meta span { color:#c78cff!important; }
      .emu-alliance-chat-meta a { min-width:0!important;overflow:hidden!important;color:#e9f8ef!important;font-weight:700!important;text-decoration:none!important;text-overflow:ellipsis!important;white-space:nowrap!important; }
      .emu-alliance-chat-meta time { margin-left:auto!important;color:#718184!important;font-size:9px!important;white-space:nowrap!important; }
      .emu-alliance-chat-message p { margin:3px 0 0!important;color:#d2dcdd!important;overflow-wrap:anywhere!important;white-space:pre-wrap!important; }
      .emu-alliance-chat-link { color:#70cfff!important;text-decoration:underline!important;text-decoration-thickness:1px!important;text-underline-offset:2px!important; }
      .emu-alliance-chat-link:visited { color:#b998ed!important; }
      .emu-alliance-chat-mention { display:inline!important;padding:0 3px!important;border:0!important;border-radius:3px!important;background:#243a40!important;color:#8ee8f2!important;font-weight:700!important; }
      .emu-alliance-chat-mention.is-you { background:#ff9f1a!important;color:#190d00!important;box-shadow:0 0 6px rgba(255,159,26,.45)!important; }
      .emu-alliance-chat-gif-media { position:relative!important;display:block!important;width:100%!important;height:clamp(110px,42vw,180px)!important;margin-top:6px!important;overflow:hidden!important;border:1px solid #2b4147!important;border-radius:7px!important;background-color:#090d0f!important;background-position:center!important;background-repeat:no-repeat!important;background-size:contain!important;contain:layout paint style!important;pointer-events:none!important;touch-action:pan-y!important;user-select:none!important;-webkit-user-select:none!important;-webkit-touch-callout:none!important; }
      .emu-alliance-chat-gif-media::after { content:"GIF"!important;position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;color:#607277!important;font:700 11px/1 Arial,sans-serif!important;letter-spacing:.08em!important;pointer-events:none!important; }
      .emu-alliance-chat-gif-media.is-active::after { opacity:0!important; }
      .emu-alliance-chat-empty { padding:28px 12px!important;color:#7e9094!important;text-align:center!important; }
      .emu-alliance-chat-compose { position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:6px!important;padding:8px!important;border-top:1px solid #26363b!important;background:#11191d!important; }
      .emu-alliance-chat-suggestions { position:absolute!important;z-index:4!important;left:8px!important;right:8px!important;bottom:calc(100% - 2px)!important;max-height:190px!important;overflow-y:auto!important;padding:4px!important;border:1px solid #3c626a!important;border-radius:7px!important;background:#0b1215!important;box-shadow:0 -6px 18px rgba(0,0,0,.65)!important; }
      .emu-alliance-chat-suggestions[hidden] { display:none!important; }
      .emu-alliance-chat-suggestion { display:flex!important;width:100%!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;padding:7px 8px!important;border:0!important;border-radius:4px!important;background:transparent!important;color:#e8f7f8!important;cursor:pointer!important;text-align:left!important; }
      .emu-alliance-chat-suggestion:hover,.emu-alliance-chat-suggestion.is-active { background:#1b4852!important; }
      #emu-family-chat-root .emu-alliance-chat-suggestion:hover,#emu-family-chat-root .emu-alliance-chat-suggestion.is-active { background:#15533f!important; }
      #emu-alliance-chat-root[data-brand="nameless"] .emu-alliance-chat-suggestion:hover,#emu-alliance-chat-root[data-brand="nameless"] .emu-alliance-chat-suggestion.is-active { background:#43245f!important; }
      .emu-alliance-chat-suggestion span { min-width:0!important;overflow:hidden!important;font-weight:700!important;text-overflow:ellipsis!important;white-space:nowrap!important; }
      .emu-alliance-chat-suggestion small { flex:0 0 auto!important;color:#84b8be!important;font-size:9px!important; }
      .emu-alliance-chat-input { min-width:0!important;height:34px!important;padding:6px 8px!important;border:1px solid #36545b!important;border-radius:5px!important;outline:none!important;background:#090d0f!important;color:#fff!important; }
      .emu-alliance-chat-input:focus { border-color:#58cbd7!important; }
      .emu-alliance-chat-send { height:34px!important;padding:0 12px!important;border:1px solid #4fbccc!important;border-radius:5px!important;background:#174b57!important;color:#fff!important;cursor:pointer!important;font-weight:700!important; }
      .emu-alliance-chat-send:disabled,.emu-alliance-chat-input:disabled { cursor:default!important;opacity:.55!important; }
      @media (max-width:720px) {
        #emu-alliance-chat-root,#emu-family-chat-root { right:var(--emu-alliance-chat-right,12px)!important;bottom:var(--emu-alliance-chat-bottom,76px)!important; }
        .emu-alliance-chat-launcher { min-width:45px!important;width:45px!important;padding:0!important;justify-content:center!important;border-radius:50%!important; }
        .emu-alliance-chat-launcher>span { display:none!important; }
        .emu-alliance-chat-panel { position:fixed!important;right:8px!important;bottom:126px!important;width:calc(100vw - 16px)!important;height:min(440px,calc(100vh - 150px))!important; }
        #emu-alliance-chat-root.is-shortcut-docked .emu-alliance-chat-panel,#emu-family-chat-root.is-shortcut-docked .emu-alliance-chat-panel { position:absolute!important;left:auto!important;top:auto!important;right:0!important;bottom:calc(var(--emu-alliance-chat-shortcut-height,40px) + 5px)!important;width:calc(100vw - 16px)!important;height:min(440px,calc(100vh - var(--emu-alliance-chat-shortcut-height,40px) - 24px))!important; }
      }
      .profile-buttons .profile-button-attack { position: relative !important; }
      .emu-caller-disable-alliance.emu-caller-alliance-cross { position: absolute; inset: 3px auto auto 3px; z-index: 12; width: 35px; height: 35px; cursor: pointer; pointer-events: auto; }
      [data-emu-caller-profile-info-header="true"] { display: flex !important; align-items: center !important; min-width: 0 !important; }
      .emu-caller-profile-alliance-warning { display: block; flex: 0 1 auto; min-width: 0; margin: 0 7px 0 4px; overflow: hidden; color: #f2493d; font-size: 12px; font-weight: 800; text-overflow: ellipsis; text-shadow: 0 1px #000; white-space: nowrap; }
      .emu-caller-disable-alliance-attack { display: flex; align-items: center; justify-content: center; position: absolute; inset: 0; z-index: 1000; width: 100%; height: 100%; box-sizing: border-box; padding: 18px; background-color: #999; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-shadow: 0 1px 0 rgba(255,255,255,.4); color: #333; text-align: center; cursor: pointer; }
      #emu-war-caller-root { position: fixed; z-index: 999999; right: 10px; top: 82px; font-family: Arial, sans-serif; color: #e6ffe9; }
      #emu-war-caller-root.emu-caller-overseas-launcher { right: 8px !important; top: 82px !important; bottom: auto !important; left: auto !important; }
      #emu-war-caller-root[data-emu-caller-inline-waiting="true"] { display: none !important; }
      #emu-war-caller-inline-slot { display: block; box-sizing: border-box; width: 100%; min-width: 0; }
      #emu-war-caller-root.inline { position: relative; z-index: 20; right: auto; top: auto; margin: 6px 0 8px; width: 100%; max-width: 100%; }
      #emu-war-caller-button { border: 1px solid #6fe58c; background: linear-gradient(#26342d, #101914); color: #aaffb7; border-radius: 4px; padding: 5px 10px; font-weight: 800; font-size: 12px; box-shadow: 0 0 8px rgba(111,229,140,.35); touch-action: none; user-select: none; cursor: grab; }
      #emu-war-caller-root[data-emu-caller-dragging="true"] #emu-war-caller-button { cursor: grabbing; }
      #emu-war-caller-button[data-ready="false"] { color: #ffd480; border-color: #b8862c; }
      #emu-war-caller-panel { display: none; width: min(430px, calc(100vw - 20px)); max-height: calc(100vh - 130px); overflow: auto; margin-top: 8px; border: 1px solid #62d98a; background: rgba(13, 17, 15, .97); box-shadow: 0 0 18px rgba(0,0,0,.65); }
      #emu-war-caller-panel.open { display: block; }
      #emu-war-caller-root.inline #emu-war-caller-panel { display: block; width: 100%; max-height: none; overflow: visible; margin-top: 6px; background: rgba(20, 20, 20, .86); }
      .emu-caller-head { display: flex; gap: 8px; align-items: center; padding: 10px; border-bottom: 1px solid rgba(111,229,140,.35); color: #82efaa; touch-action: none; user-select: none; cursor: grab; }
      #emu-war-caller-root[data-emu-caller-dragging="true"] .emu-caller-head { cursor: grabbing; }
      .emu-caller-head strong { flex: 1; font-size: 16px; }
      .emu-caller-version { color: #8ca897; font-size: 9px; font-weight: 700; }
      .emu-caller-head button { border: 1px solid #72808a; background: #1a2024; color: #fff; width: 28px; height: 28px; touch-action: manipulation; cursor: pointer; }
      #emu-caller-connection-dot { width: 10px; height: 10px; border-radius: 50%; background: #b33; box-shadow: 0 0 8px #b33; }
      #emu-caller-connection-dot[data-connected="true"] { background: #58ff72; box-shadow: 0 0 8px #58ff72; }
      .emu-caller-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)) 36px 36px; border-bottom: 1px solid rgba(111,229,140,.28); }
      .emu-caller-tabs button { border: 0; border-right: 1px solid rgba(255,255,255,.08); background: linear-gradient(#3a3a3a, #222); color: #eee; padding: 8px 4px; font-size: 11px; font-weight: 800; }
      .emu-caller-tabs button.active { background: linear-gradient(#6e8d4e, #202d1f); color: #bfff7d; }
      .emu-caller-tabs .emu-caller-icon-tab { display: flex; align-items: center; justify-content: center; padding: 0; }
      .emu-caller-tabs .emu-caller-icon-tab svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .emu-caller-tabs .emu-caller-shout-tab span { font-size: 18px; line-height: 1; filter: saturate(.9); }
      .emu-caller-tabs [data-tab="announcements"].active { color: #ffd95a; }
      #emu-war-caller-root.inline .emu-caller-tabs button { padding: 7px 4px; font-size: 12px; }
      #emu-caller-status { padding: 8px 10px; color: #b7f8c8; border-bottom: 1px solid rgba(111,229,140,.2); font-size: 12px; }
      #emu-caller-tab-body { padding: 10px; }
      .emu-caller-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .emu-caller-grid > div { border: 1px solid rgba(111,229,140,.35); background: rgba(8, 28, 14, .75); padding: 8px; min-height: 44px; }
      .emu-caller-grid span { display: block; color: #9ab5a2; text-transform: uppercase; font-size: 10px; margin-bottom: 4px; }
      .emu-caller-grid strong { color: #8dff96; font-size: 16px; overflow-wrap: anywhere; }
      .emu-caller-actions { display: flex; gap: 8px; margin-top: 10px; }
      .emu-caller-actions button, .emu-caller-call-row button { border: 1px solid #6fe58c; background: #0a1f12; color: #9fffaa; padding: 7px 10px; font-weight: 800; }
      .emu-caller-label { display: block; color: #c6d6ca; font-weight: 700; margin-bottom: 10px; }
      .emu-caller-label input, .emu-caller-label select { display: block; box-sizing: border-box; width: 100%; margin-top: 5px; border: 1px solid #607080; background: #070b0d; color: #fff; padding: 8px; }
      .emu-caller-check { display: block; margin: 8px 0; color: #dcefe1; }
      .emu-caller-settings-group { display: block; box-sizing: border-box; margin: 0 0 10px; padding: 10px; border: 1px solid rgba(111,229,140,.25); border-radius: 5px; background: rgba(5,18,10,.5); }
      .emu-caller-settings-group:last-child { margin-bottom: 0; }
      .emu-caller-settings-group > .emu-caller-page-title { padding-bottom: 6px; border-bottom: 1px solid rgba(111,229,140,.18); }
      .emu-caller-market-pages { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 5px; margin: -3px 0 8px; padding: 7px 8px; border: 1px solid rgba(111,229,140,.18); border-radius: 4px; background: rgba(0,0,0,.18); }
      .emu-caller-market-pages .emu-caller-check { margin: 0; font-size: 10px; white-space: nowrap; }
      .emu-caller-market-pages.disabled { opacity: .42; }
      .emu-caller-setting-toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; box-sizing: border-box; margin: 9px 0 10px; padding: 9px 10px; border: 1px solid rgba(111,229,140,.32); border-radius: 4px; background: rgba(8,28,14,.55); }
      .emu-caller-setting-toggle > div { min-width: 0; }
      .emu-caller-setting-toggle strong, .emu-caller-setting-toggle small { display: block; }
      .emu-caller-setting-toggle strong { color: #dcefe1; font-size: 11px; }
      .emu-caller-setting-toggle small { margin-top: 3px; color: #91a69a; font-size: 9px; line-height: 1.3; }
      .emu-caller-setting-toggle .emu-caller-switch { flex: 0 0 auto; cursor: pointer; }
      .emu-caller-quick-key { border: 1px solid rgba(111,229,140,.5); background: rgba(5,20,10,.82); padding: 10px; margin-bottom: 10px; }
      .emu-caller-quick-key strong { display: block; color: #8dff96; font-size: 14px; }
      .emu-caller-quick-key p { margin: 5px 0 10px; color: #bdeccb; font-size: 12px; line-height: 1.35; }
      .emu-caller-key-choices { margin: 8px 0 10px; padding: 8px; border: 1px solid rgba(111,229,140,.35); border-radius: 3px; background: rgba(8,28,14,.55); }
      .emu-caller-key-choices p { margin: 0 0 7px; color: #bdeccb; font-size: 10px; line-height: 1.35; }
      .emu-caller-key-choices > div { display: flex; flex-wrap: wrap; gap: 6px; }
      .emu-caller-key-choices a { flex: 1 1 120px; border: 1px solid #71808a; border-radius: 3px; background: #1a2024; color: #e5edf2; padding: 6px 8px; font-size: 10px; font-weight: 900; text-align: center; text-decoration: none; }
      .emu-caller-key-choices a.recommended { border-color: #6fe58c; background: #0a1f12; color: #9fffaa; }
      .emu-caller-provider-box { margin: 10px 0; padding: 9px; border: 1px solid rgba(137,174,208,.4); border-radius: 3px; background: rgba(20,25,30,.72); }
      .emu-caller-provider-title { display: block; margin-bottom: 7px; color: #e7edf2; font-size: 11px; font-weight: 900; letter-spacing: .4px; text-transform: uppercase; }
      .emu-caller-provider-box p { margin: 4px 0 8px; color: #aebbc5; font-size: 11px; line-height: 1.35; }
      .emu-caller-provider-box .emu-caller-check { margin: 6px 0; }
      .emu-caller-provider-box small { color: #91a69a; font-size: 10px; font-weight: 400; }
      .emu-caller-provider-box > button { border: 1px solid #5792bd; border-radius: 3px; background: #142533; color: #9ed8ff; padding: 6px 8px; font-size: 10px; font-weight: 900; }
      .emu-caller-provider-box > button:disabled { opacity: .55; cursor: wait; }
      .emu-caller-provider-links { display: flex; flex-wrap: wrap; gap: 6px; margin: 7px 0 10px; }
      .emu-caller-provider-links a { border: 1px solid #5792bd; border-radius: 3px; background: #142533; color: #9ed8ff; padding: 5px 7px; font-size: 10px; font-weight: 800; text-decoration: none; }
      .emu-caller-provider-links a.emu-caller-update-link { border-color: #6fe58c; background: #0a1f12; color: #9fffaa; }
      .emu-caller-privacy-note { display: block; margin-top: 7px; color: #8fa49a; line-height: 1.3; }
      .emu-caller-provider-status { display: block; min-height: 13px; margin: 6px 0; color: #86d997; font-size: 10px; font-weight: 800; }
      .emu-caller-provider-status.error { color: #ff8585; }
      .emu-caller-provider-consent { font-size: 10px; line-height: 1.3; }
      .emu-caller-call-list { display: grid; gap: 8px; }
      .emu-caller-call-row { display: flex; gap: 8px; align-items: center; justify-content: space-between; border: 1px solid rgba(111,229,140,.3); padding: 8px; background: rgba(10,25,14,.8); }
      .emu-caller-call-row span { display: block; color: #9ab5a2; font-size: 11px; margin-top: 2px; }
      .emu-caller-call-row small { color: #91ad9a; font-weight: 800; }
      .emu-caller-empty, .emu-caller-help { color: #d8e8dc; line-height: 1.4; }
      .emu-caller-section-title { margin: 10px 0 6px; color: #a8c894; font-size: 10px; font-weight: 900; letter-spacing: .5px; text-transform: uppercase; }
      .emu-caller-attack-list { display: grid; gap: 7px; }
      .emu-caller-attack-request { display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid rgba(111,229,140,.35); border-radius: 3px; background: linear-gradient(rgba(58,58,58,.92), rgba(30,30,30,.94)); padding: 8px; }
      .emu-caller-attack-request strong, .emu-caller-attack-request span { display: block; }
      .emu-caller-attack-request strong { color: #e7f3df; }
      .emu-caller-attack-request span { margin-top: 3px; color: #aebca8; font-size: 11px; }
      .emu-caller-attack-request button { flex: 0 0 auto; border: 1px solid #6fa8ff; border-radius: 3px; background: linear-gradient(#318dcc, #176296); color: #fff; padding: 6px 8px; font-weight: 900; }
      .emu-caller-attack-request.scope-faction { border-color: rgba(111,229,140,.7); background: linear-gradient(rgba(17,63,31,.96), rgba(7,31,15,.97)); box-shadow: inset 3px 0 #6fe58c; }
      .emu-caller-attack-request.scope-faction strong { color: #aaffb7; }
      .emu-caller-attack-request.scope-faction button { border-color: #6fe58c; background: linear-gradient(#238446, #14572d); }
      .emu-caller-attack-request.scope-alliance { border-color: rgba(194,123,255,.72); background: linear-gradient(rgba(60,29,82,.96), rgba(29,13,44,.97)); box-shadow: inset 3px 0 #c27bff; }
      .emu-caller-attack-request.scope-alliance strong { color: #ebceff; }
      .emu-caller-attack-request.scope-alliance button { border-color: #c27bff; background: linear-gradient(#743cac, #4c2178); }
      .emu-caller-attack-request button:disabled, .emu-caller-attack-request.full button { border-color: #666; background: #3a3a3a; color: #999; }
      .emu-caller-event-list { display: grid; gap: 7px; }
      .emu-caller-event-row { border: 1px solid rgba(111,229,140,.28); background: rgba(10,25,14,.72); padding: 8px; }
      .emu-caller-event-row strong, .emu-caller-event-row span, .emu-caller-event-row small { display: block; }
      .emu-caller-event-row span { color: #cfe9d5; margin-top: 3px; }
      .emu-caller-event-row small { color: #91ad9a; margin-top: 3px; }
      .emu-caller-row-enhanced { position: relative; }
      [data-emu-caller-faction-bsp-row="true"], [data-emu-caller-faction-bsp-header="true"] { display: flex !important; align-items: stretch !important; box-sizing: border-box !important; width: 100% !important; }
      [data-emu-caller-faction-bsp-row="true"] > *, [data-emu-caller-faction-bsp-header="true"] > * { float: none !important; box-sizing: border-box !important; min-width: 0 !important; }
      html:not(.emu-caller-tornpda) [data-emu-caller-company-bsp-row="true"] { display: grid !important; grid-template-columns: minmax(0, 31fr) minmax(0, 19fr) minmax(52px, 7fr) minmax(58px, 7fr) minmax(0, 36fr) !important; align-items: stretch !important; }
      html:not(.emu-caller-tornpda) [data-emu-caller-company-bsp-row="true"] > * { width: auto !important; max-width: none !important; align-self: stretch !important; }
      html:not(.emu-caller-tornpda) [data-emu-caller-company-bsp-header="true"] { display: flex !important; align-items: stretch !important; }
      html:not(.emu-caller-tornpda) [data-emu-caller-company-bsp-header="true"] > * { position: relative !important; inset: auto !important; grid-column: auto !important; grid-row: auto !important; float: none !important; width: auto !important; max-width: none !important; margin: 0 !important; box-sizing: border-box !important; }
      html:not(.emu-caller-tornpda) [data-emu-caller-company-bsp-header="true"] > :nth-child(1) { flex: 0 0 31% !important; }
      html:not(.emu-caller-tornpda) [data-emu-caller-company-bsp-header="true"] > :nth-child(2) { flex: 0 0 19% !important; }
      html:not(.emu-caller-tornpda) [data-emu-caller-company-bsp-header="true"] > :nth-child(3) { flex: 0 0 7% !important; }
      html:not(.emu-caller-tornpda) [data-emu-caller-company-bsp-header="true"] > :nth-child(4) { flex: 0 0 7% !important; min-width: 58px !important; }
      html:not(.emu-caller-tornpda) [data-emu-caller-company-bsp-header="true"] > :nth-child(5) { flex: 1 1 36% !important; }
      [data-emu-caller-company-bsp-row="true"] > .emu-caller-faction-bsp-cell, [data-emu-caller-company-bsp-header="true"] > .emu-caller-faction-bsp-header { width: auto !important; min-width: 58px !important; height: auto !important; margin: 0 !important; }
      .emu-caller-faction-bsp-cell, .emu-caller-faction-bsp-header { display: flex !important; flex: 0 0 58px !important; width: 58px !important; align-items: center !important; justify-content: center !important; padding: 0 3px !important; text-align: center !important; box-sizing: border-box !important; }
      .emu-caller-faction-bsp-cell { align-self: stretch !important; min-height: 100% !important; border-left: 1px solid rgba(0,0,0,.55) !important; border-right: 1px solid rgba(0,0,0,.55) !important; background: rgba(0,0,0,.035) !important; }
      .emu-caller-faction-bsp-header { color: #eee !important; font-weight: 800 !important; text-shadow: 0 1px #000 !important; }
      .emu-caller-faction-bsp-header[data-emu-caller-faction-bsp-sort-bound="true"] { cursor: pointer !important; user-select: none !important; font-size: 10px !important; white-space: nowrap !important; }
      .emu-caller-faction-bsp-header[data-sort-direction="asc"], .emu-caller-faction-bsp-header[data-sort-direction="desc"] { color: #9cff68 !important; }
      .emu-caller-faction-bsp-value { display: inline-flex; width: 50px; min-height: 20px; align-items: center; justify-content: center; box-sizing: border-box; border: 1px solid #050505; border-radius: 3px; background: #d8d8d8; color: #050505; font-size: 11px; font-weight: 900; line-height: 18px; text-shadow: none; box-shadow: inset 0 1px rgba(255,255,255,.25); }
      .emu-caller-faction-bsp-value[data-tier="red"], .emu-caller-profile-bsp-box[data-tier="red"] strong { background: #f2483d; }
      .emu-caller-faction-bsp-value[data-tier="orange"], .emu-caller-profile-bsp-box[data-tier="orange"] strong { background: #f3b04d; }
      .emu-caller-faction-bsp-value[data-tier="blue"], .emu-caller-profile-bsp-box[data-tier="blue"] strong { background: #5ca9ff; }
      .emu-caller-faction-bsp-value[data-tier="green"], .emu-caller-profile-bsp-box[data-tier="green"] strong { background: #98e875; }
      .emu-caller-faction-bsp-value[data-tier="white"], .emu-caller-profile-bsp-box[data-tier="white"] strong { background: #f5f5f5; }
      .emu-caller-faction-bsp-value[data-tier="grey"], .emu-caller-profile-bsp-box[data-tier="grey"] strong { background: #b8b8b8; }
      .emu-caller-faction-bsp-value[data-tier="pending"], .emu-caller-profile-bsp-box[data-tier="pending"] strong { background: #353535; color: #aaa; }
      .faction-war .emu-caller-foreign-war-bsp-badge { display: inline-flex !important; position: static !important; z-index: auto !important; float: none !important; width: 38px !important; min-width: 38px !important; max-width: 38px !important; height: 20px !important; min-height: 20px !important; margin: 0 3px 0 0 !important; padding: 0 2px !important; vertical-align: middle !important; pointer-events: none !important; font-size: 9px !important; line-height: 18px !important; }
      [data-emu-caller-company-card-row] { position: relative !important; }
      .emu-caller-company-card-bsp { position: absolute; z-index: 100; display: inline-block; margin: 0; }
      .emu-caller-company-card-bsp-inner { position: absolute; z-index: 100; margin: 0; }
      .emu-caller-company-card-bsp .emu-caller-faction-bsp-value { width: 44px; }
      [data-emu-caller-company-collision-safe="true"] > .emu-caller-company-card-bsp { position: static !important; z-index: auto !important; display: inline-flex !important; width: 46px !important; min-width: 46px !important; height: 20px !important; margin: 0 0 0 5px !important; padding: 0 !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important; vertical-align: middle !important; pointer-events: none !important; }
      [data-emu-caller-company-collision-safe="true"] > .emu-caller-company-card-bsp > .emu-caller-company-card-bsp-inner { position: static !important; display: inline-flex !important; width: 44px !important; margin: 0 !important; }
      [data-emu-caller-company-collision-safe="true"] > .emu-caller-company-card-bsp .emu-caller-faction-bsp-value { width: 44px !important; min-width: 44px !important; max-width: 44px !important; pointer-events: auto !important; }
      [data-emu-caller-company-name-cell="true"] { position: relative !important; box-sizing: border-box !important; padding-right: 52px !important; overflow: hidden !important; }
      [data-emu-caller-company-name-cell="true"] > .emu-caller-company-card-bsp { position: absolute !important; z-index: 5 !important; top: 50% !important; right: 4px !important; bottom: auto !important; left: auto !important; display: inline-flex !important; width: 44px !important; min-width: 44px !important; height: 20px !important; margin: 0 !important; padding: 0 !important; align-items: center !important; justify-content: center !important; transform: translateY(-50%) !important; pointer-events: none !important; }
      [data-emu-caller-company-name-cell="true"] > .emu-caller-company-card-bsp > .emu-caller-company-card-bsp-inner { position: static !important; display: inline-flex !important; width: 42px !important; margin: 0 !important; }
      [data-emu-caller-company-name-cell="true"] > .emu-caller-company-card-bsp .emu-caller-faction-bsp-value { width: 42px !important; min-width: 42px !important; max-width: 42px !important; pointer-events: auto !important; }
      html.emu-caller-tornpda [data-emu-caller-company-pda-row="true"] { position: relative !important; }
      html.emu-caller-tornpda [data-emu-caller-company-pda-row="true"] > .emu-caller-company-card-bsp { position: absolute !important; z-index: 5 !important; top: 7px !important; right: 7px !important; bottom: auto !important; left: auto !important; display: inline-flex !important; width: 42px !important; height: 18px !important; margin: 0 !important; padding: 0 !important; align-items: center !important; justify-content: center !important; transform: none !important; pointer-events: none !important; }
      html.emu-caller-tornpda [data-emu-caller-company-pda-row="true"] > .emu-caller-company-card-bsp > .emu-caller-company-card-bsp-inner { position: static !important; display: inline-flex !important; width: 40px !important; margin: 0 !important; }
      html.emu-caller-tornpda [data-emu-caller-company-pda-row="true"] > .emu-caller-company-card-bsp .emu-caller-faction-bsp-value { width: 40px !important; min-width: 40px !important; max-width: 40px !important; min-height: 18px !important; height: 18px !important; font-size: 9px !important; line-height: 16px !important; pointer-events: auto !important; }
      [data-emu-caller-advanced-search-bsp-host] { position: relative !important; }
      .emu-caller-advanced-search-bsp { position: absolute !important; z-index: 100 !important; display: inline-block !important; margin: 6px 3px !important; padding: 0 !important; overflow: visible !important; pointer-events: none !important; }
      .emu-caller-advanced-search-bsp-inner { position: absolute !important; z-index: 100 !important; margin: 0 !important; }
      .emu-caller-advanced-search-bsp .emu-caller-faction-bsp-value { width: 44px !important; pointer-events: auto !important; }
      [data-emu-caller-target-list-bsp-host] { display: flex !important; align-items: center !important; gap: 5px !important; min-width: 0 !important; padding-left: 6px !important; }
      .emu-caller-target-list-bsp { display: inline-flex !important; flex: 0 0 52px !important; width: 52px !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important; pointer-events: none !important; }
      .emu-caller-target-list-bsp + [class*="content"] { min-width: 0 !important; flex: 1 1 auto !important; }
      .emu-caller-target-list-bsp .emu-caller-faction-bsp-value { width: 48px !important; min-width: 48px !important; max-width: 48px !important; height: 20px !important; min-height: 20px !important; padding: 0 2px !important; overflow: hidden !important; font-size: 10px !important; line-height: 18px !important; white-space: nowrap !important; pointer-events: auto !important; }
      @media (max-width: 700px) { [data-emu-caller-target-list-bsp-host] { gap: 3px !important; padding-left: 3px !important; } .emu-caller-target-list-bsp { flex-basis: 46px !important; width: 46px !important; } .emu-caller-target-list-bsp .emu-caller-faction-bsp-value { width: 42px !important; min-width: 42px !important; max-width: 42px !important; font-size: 9px !important; } }
      .emu-caller-roulette-bsp-host { position: relative !important; }
      .emu-caller-roulette-bsp { position: absolute !important; z-index: 5 !important; right: 2px !important; bottom: 2px !important; display: block !important; width: 36px !important; min-width: 36px !important; max-width: 36px !important; height: 14px !important; min-height: 14px !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; box-sizing: border-box !important; pointer-events: none !important; }
      .emu-caller-roulette-bsp .emu-caller-faction-bsp-value { width: 36px !important; min-width: 36px !important; max-width: 36px !important; height: 14px !important; min-height: 14px !important; padding: 0 1px !important; overflow: hidden !important; border-radius: 2px !important; font-size: 8px !important; line-height: 12px !important; pointer-events: none !important; }
      @media (max-width: 700px) { .emu-caller-roulette-bsp { right: 1px !important; bottom: 1px !important; width: 34px !important; min-width: 34px !important; max-width: 34px !important; } .emu-caller-roulette-bsp .emu-caller-faction-bsp-value { width: 34px !important; min-width: 34px !important; max-width: 34px !important; font-size: 8px !important; } }
      [data-emu-caller-hof-bsp-anchor="true"] { position: relative !important; overflow: visible !important; }
      .emu-caller-hof-bsp-injection { position: absolute !important; z-index: 100 !important; display: block !important; top: 50% !important; left: var(--emu-caller-hof-inline-left, 50px) !important; right: auto !important; width: 32px !important; height: 20px !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; pointer-events: none !important; transform: translateY(-50%) !important; }
      .emu-caller-hof-bsp-injection[hidden] { display: none !important; }
      .emu-caller-hof-bsp-inner { position: static !important; display: block !important; z-index: 100 !important; margin: 0 !important; }
      .emu-caller-hof-bsp-badge { width: 32px !important; min-width: 32px !important; max-width: 32px !important; height: 20px !important; min-height: 20px !important; padding: 0 !important; border: 1px solid #000 !important; border-radius: 0 !important; font-family: initial !important; font-size: 12px !important; font-weight: bold !important; line-height: 18px !important; box-shadow: none !important; pointer-events: auto !important; }
      [data-emu-caller-hof-collision-safe="true"] { box-sizing: border-box !important; padding-right: 40px !important; }
      [data-emu-caller-hof-collision-safe="true"] > .emu-caller-hof-bsp-injection { left: auto !important; right: 4px !important; }
      .emu-caller-profile-bsp-box { position: relative; z-index: 4; display: flex; flex: 0 0 auto; width: max-content; min-width: 92px; min-height: 22px; margin: 0 0 0 8px; align-items: center; overflow: hidden; border: 1px solid #181818; border-radius: 3px; background: linear-gradient(#444,#242424); color: #eee; font: 800 10px/20px Arial,sans-serif; text-shadow: 0 1px #000; box-shadow: inset 0 1px rgba(255,255,255,.12),0 1px 1px rgba(0,0,0,.45); }
      .emu-caller-profile-bsp-box b { padding: 0 6px; color: #ddd; letter-spacing: .3px; }
      .emu-caller-profile-bsp-box strong { min-width: 54px; padding: 0 6px; border-left: 1px solid #111; color: #050505; font-size: 11px; line-height: 20px; text-align: center; text-shadow: none; }
      .faction-war .emu-caller-bsp-cell { float: left !important; display: flex !important; width: 32px !important; height: 34px !important; box-sizing: border-box !important; align-items: center !important; justify-content: center !important; margin: 0 !important; padding: 0 !important; border: 0 !important; background: transparent !important; color: #050505 !important; text-align: center !important; text-shadow: none !important; z-index: 10 !important; }
      .faction-war .emu-caller-war-bsp-value { display: inline-flex !important; width: max-content !important; min-width: 0 !important; max-width: calc(100% - 2px) !important; height: 20px !important; box-sizing: border-box !important; align-items: center !important; justify-content: center !important; padding: 0 3px !important; overflow: hidden !important; border: 1px solid #050505 !important; border-radius: 3px !important; background: #d8d8d8 !important; color: #050505 !important; font-size: 11px !important; font-weight: 900 !important; line-height: 18px !important; text-overflow: clip !important; text-shadow: none !important; white-space: nowrap !important; }
      .faction-war .emu-caller-bsp-cell[data-tier="red"] .emu-caller-war-bsp-value { background: #f2483d !important; }
      .faction-war .emu-caller-bsp-cell[data-tier="orange"] .emu-caller-war-bsp-value { background: #f3b04d !important; }
      .faction-war .emu-caller-bsp-cell[data-tier="blue"] .emu-caller-war-bsp-value { background: #5ca9ff !important; }
      .faction-war .emu-caller-bsp-cell[data-tier="green"] .emu-caller-war-bsp-value { background: #98e875 !important; }
      .faction-war .emu-caller-bsp-cell[data-tier="white"] .emu-caller-war-bsp-value { background: #f5f5f5 !important; }
      .faction-war .emu-caller-bsp-cell[data-tier="grey"] .emu-caller-war-bsp-value { background: #b8b8b8 !important; }
      .faction-war .emu-caller-bsp-cell[data-tier="pending"] .emu-caller-war-bsp-value { border-color: transparent !important; background: rgba(20,20,20,.58) !important; color: #999 !important; }
      .faction-war .emu-caller-bsp-header, .table-header .emu-caller-bsp-header { float: left !important; width: 44px !important; height: 35px !important; box-sizing: border-box !important; padding: 0 !important; border-left: 1px solid rgba(255,255,255,.08) !important; border-right: 1px solid rgba(0,0,0,.42) !important; background: transparent !important; color: inherit !important; font-size: 12px !important; font-weight: 700 !important; line-height: 35px !important; text-align: center !important; }
      .faction-war .emu-caller-clock-header, .faction-war .emu-caller-clock-cell { display: flex !important; float: left !important; flex: 0 0 28px !important; width: 28px !important; height: 35px !important; box-sizing: border-box !important; align-items: center !important; justify-content: center !important; padding: 0 !important; }
      .faction-war .emu-caller-clock-cell { height: 34px !important; }
      .faction-war .members-list[data-emu-caller-bsp="true"] .level:not(.emu-caller-bsp-cell):not(.emu-caller-bsp-header), .faction-war .members-list[data-emu-caller-bsp="true"] .lvl:not(.emu-caller-bsp-cell):not(.emu-caller-bsp-header) { width: 29px !important; }
      .faction-war .members-list[data-emu-caller-bsp="true"] .points { width: 38px !important; }
      .faction-war .members-list[data-emu-caller-bsp="true"] .status { width: 50px !important; }
      .faction-war .members-list[data-emu-caller-bsp="true"] .attack { width: 116px !important; }
      [data-emu-caller-bsp-header="true"] > .level:not(.emu-caller-bsp-header), [data-emu-caller-bsp-header="true"] > .lvl:not(.emu-caller-bsp-header) { width: 29px !important; }
      [data-emu-caller-bsp-header="true"] > .points { width: 38px !important; }
      [data-emu-caller-bsp-header="true"] > .status { width: 50px !important; }
      [data-emu-caller-bsp-header="true"] > .attack { width: 116px !important; }
      .faction-war .members-list[data-emu-caller-controls="true"] .attack { width: 116px !important; white-space: nowrap !important; }
      [data-emu-caller-controls-header="true"] > .attack { width: 116px !important; white-space: nowrap !important; }
      .faction-war .emu-caller-attack-cell { white-space: nowrap !important; }
      html[data-emu-war-caller-runtime] .faction-war .tt-stats-estimate,
      html[data-emu-war-caller-runtime] #faction_war_list_id .tt-stats-estimate { display: none !important; width: 0 !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
      @media (min-width: 701px) {
        .faction-war.emu-caller-wide-war { width: var(--emu-caller-wide-war-width) !important; max-width: none !important; }
        .emu-caller-wide-war-shell { overflow-x: visible !important; }
        .faction-war.emu-caller-two-column-war { display: flow-root !important; }
        .faction-war.emu-caller-two-column-war .emu-caller-native-panel-row { display: flex !important; align-items: flex-start !important; flex-wrap: nowrap !important; width: 100% !important; }
        .faction-war.emu-caller-two-column-war .emu-caller-native-panel { float: left !important; clear: none !important; position: relative !important; top: auto !important; left: auto !important; right: auto !important; box-sizing: border-box !important; width: 50% !important; max-width: 50% !important; min-width: 0 !important; margin: 0 !important; vertical-align: top !important; }
        .faction-war.emu-caller-two-column-war .emu-caller-native-panel[data-emu-caller-native-panel-side="own"] { float: right !important; }
        .faction-war.emu-caller-two-column-war .emu-caller-native-panel-row > .emu-caller-native-panel { float: none !important; flex: 0 0 50% !important; }
        .faction-war.emu-caller-two-column-war .emu-caller-native-panel .members-list,
        .faction-war.emu-caller-two-column-war .members-list.emu-caller-native-panel { box-sizing: border-box !important; width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
      }
      .emu-caller-cat-strip { display: inline-grid; grid-template-columns: minmax(70px, 1.25fr) minmax(50px, .7fr) minmax(46px, .62fr) minmax(68px, 1fr) minmax(84px, .9fr) auto auto; align-items: center; gap: 3px; max-width: 100%; margin: 0 4px; vertical-align: middle; white-space: nowrap; }
      .emu-caller-cat-name { display: block; min-width: 0; max-width: 118px; overflow: hidden; text-overflow: ellipsis; color: #f3f3f3; font-size: 10px; font-weight: 900; line-height: 1.1; text-shadow: 0 1px 2px #000; }
      .emu-caller-row-info { display: inline-flex; align-items: center; gap: 4px; margin: 0 5px; vertical-align: middle; white-space: nowrap; }
      .emu-caller-bsp-slot, .emu-caller-score-slot, .emu-caller-status-slot, .emu-caller-detail-slot { display: inline-flex; align-items: center; justify-content: center; min-height: 18px; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 900; line-height: 1; text-transform: uppercase; }
      .emu-caller-bsp-slot { color: #ff5577; background: rgba(60, 0, 8, .62); border: 1px solid rgba(255, 85, 119, .45); }
      .emu-caller-score-slot { color: #f47cff; background: rgba(46, 8, 58, .62); border: 1px solid rgba(244, 124, 255, .45); }
      .emu-caller-status-slot { color: #a8ff8a; background: rgba(8, 42, 14, .62); border: 1px solid rgba(111, 229, 140, .45); max-width: 112px; overflow: hidden; text-overflow: ellipsis; }
      .emu-caller-detail-slot { justify-content: flex-start; gap: 2px; color: #ffe38a; background: rgba(45, 35, 8, .52); border: 1px solid rgba(255, 207, 96, .35); overflow: hidden; }
      .emu-caller-detail-chip { display: inline-flex; align-items: center; gap: 2px; white-space: nowrap; font-size: 9px; font-weight: 900; color: #8dff96; }
      .emu-caller-detail-chip span { color: #ffe38a; }
      .emu-caller-detail-chip.kind-energy { color: #83df4f; }
      .emu-caller-detail-chip.kind-drug { color: #9fdc60; }
      .emu-caller-detail-chip.kind-booster { color: #ffd66d; }
      .emu-caller-detail-chip.kind-medical { color: #9ed8ff; }
      .emu-caller-detail-empty { color: #6f7f71; }
      .faction-war [data-emu-caller-cat-header-host="true"] { display: block !important; box-sizing: border-box !important; height: 30px !important; min-height: 30px !important; padding: 0 !important; overflow: hidden !important; }
      .faction-war [data-emu-caller-cat-header-host="true"] > :not(.emu-caller-cat-header) { display: none !important; }
      .faction-war [data-emu-caller-cat-row-host="true"] { display: block !important; box-sizing: border-box !important; width: 100% !important; height: 35px !important; min-height: 35px !important; padding: 0 !important; overflow: hidden !important; border-bottom: 1px solid rgba(0,0,0,.38) !important; }
      .faction-war [data-emu-caller-cat-row-host="true"] > :not(.emu-caller-cat-row) { display: none !important; }
      .emu-caller-cat-header, .emu-caller-cat-row { box-sizing: border-box !important; width: 100% !important; min-width: 0 !important; font-family: Arial, sans-serif !important; }
      .emu-caller-cat-header { display: grid !important; align-items: center !important; height: 34px !important; padding: 0 6px !important; background: linear-gradient(#555,#292929) !important; color: #f3f3f3 !important; font-size: 10px !important; font-weight: 900 !important; text-shadow: 0 1px #000 !important; }
      .emu-caller-cat-row { display: grid !important; align-items: center !important; height: 35px !important; padding: 0 6px !important; background: rgba(51,51,51,.96) !important; color: #ddd !important; }
      .emu-caller-cat-row[data-side="enemy"], .emu-caller-cat-header[data-side="enemy"] { grid-template-columns: minmax(120px,1fr) minmax(50px,72px) minmax(42px,58px) minmax(60px,80px) minmax(78px,92px) minmax(38px,48px) !important; }
      .emu-caller-cat-row[data-side="own"], .emu-caller-cat-header[data-side="own"] { grid-template-columns: minmax(120px,1fr) minmax(50px,72px) minmax(42px,58px) minmax(60px,80px) 36px 36px 36px minmax(38px,48px) !important; }
      .emu-caller-cat-header > *, .emu-caller-cat-row > span:not(:first-child) { min-width: 0 !important; text-align: center !important; }
      .emu-caller-cat-header button { display: flex !important; align-items: center !important; justify-content: center !important; gap: 2px !important; width: 100% !important; height: 34px !important; margin: 0 !important; padding: 0 2px !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; color: inherit !important; font: inherit !important; text-shadow: inherit !important; cursor: pointer !important; touch-action: manipulation !important; }
      .emu-caller-cat-header button:first-child { justify-content: flex-start !important; }
      .emu-caller-cat-header button i { min-width: 8px !important; color: #9bd3ff !important; font-style: normal !important; font-size: 9px !important; }
      .emu-caller-cat-icon-head { overflow: hidden !important; font-size: 12px !important; }
      .emu-caller-cat-member { display: flex !important; min-width: 0 !important; flex-direction: column !important; justify-content: center !important; color: #d7d7d7 !important; text-decoration: none !important; line-height: 1.05 !important; }
      .emu-caller-cat-member strong { overflow: hidden !important; color: #d7d7d7 !important; font-size: 11px !important; font-weight: 800 !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
      .emu-caller-cat-row[data-side="own"] .emu-caller-cat-member strong { color: #f0b52f !important; }
      .emu-caller-cat-member small { margin-top: 2px !important; color: #b9b9b9 !important; font-size: 8px !important; font-weight: 700 !important; }
      .emu-caller-cat-revive { display: none !important; }
      .emu-caller-cat-revive.on { background: #70c51c !important; }
      .emu-caller-cat-revive.off { background: #e55252 !important; }
      .emu-caller-cat-revive.unknown { display: none !important; }
      .emu-caller-cat-ff { color: #62c5ff !important; font-size: 10px !important; font-weight: 900 !important; white-space: nowrap !important; }
      .emu-caller-cat-score { color: #eee !important; font-size: 10px !important; font-weight: 900 !important; }
      .emu-caller-cat-status { overflow: hidden !important; color: #8dd323 !important; font-size: 10px !important; font-weight: 900 !important; text-overflow: ellipsis !important; text-transform: uppercase !important; white-space: nowrap !important; }
      .emu-caller-cat-status.is-hospital, .emu-caller-cat-status.is-jail { color: #ef6c71 !important; }
      .emu-caller-cat-status.is-travel { color: #33c4dc !important; }
      .emu-caller-cat-status.is-unknown { color: #9a9a9a !important; }
      .emu-caller-cat-status.own { display: flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important; overflow: visible !important; }
      .emu-caller-cat-status.own > b { overflow: hidden !important; text-overflow: ellipsis !important; }
      .emu-caller-cat-actions { display: flex !important; align-items: center !important; justify-content: center !important; gap: 5px !important; white-space: nowrap !important; }
      .emu-caller-cat-actions .emu-caller-call-button { width: 46px !important; min-width: 46px !important; min-height: 20px !important; padding: 1px 3px !important; font-size: 8px !important; }
      .emu-caller-cat-attack { display: inline-flex !important; align-items: center !important; justify-content: center !important; min-height: 20px !important; border: 1px solid #ff6475 !important; border-radius: 3px !important; background: linear-gradient(#a51f32,#741020) !important; color: #fff !important; padding: 0 5px !important; font-size: 9px !important; font-weight: 900 !important; text-decoration: none !important; }
      .emu-caller-cat-last { color: #aaa !important; font-size: 9px !important; font-weight: 800 !important; white-space: nowrap !important; }
      .emu-caller-cat-telemetry-cell { display: flex !important; align-items: center !important; justify-content: center !important; gap: 1px !important; min-width: 0 !important; overflow: hidden !important; color: #777 !important; font-size: 8px !important; white-space: nowrap !important; }
      .emu-caller-cat-telemetry-cell i { flex: 0 0 auto !important; font-style: normal !important; font-size: 10px !important; }
      .emu-caller-cat-telemetry-cell b { min-width: 0 !important; overflow: hidden !important; font-size: 7px !important; text-overflow: ellipsis !important; }
      .emu-caller-cat-telemetry-cell.has-value, .emu-caller-cat-telemetry-cell.ready { color: #83cf45 !important; }
      .emu-caller-cat-telemetry-cell.cooling { color: #b7b7b7 !important; }
      .emu-caller-cat-telemetry-cell.disabled { color: #666 !important; filter: grayscale(1) !important; opacity: .55 !important; }
      .emu-caller-cat-telemetry { display: inline-flex !important; align-items: center !important; gap: 3px !important; color: #707770 !important; font-style: normal !important; }
      .emu-caller-cat-telemetry span { opacity: .45 !important; filter: grayscale(1) !important; font-size: 10px !important; line-height: 1 !important; }
      .emu-caller-cat-telemetry span.has-value { opacity: 1 !important; filter: none !important; }
      .emu-caller-cat-telemetry .kind-energy.has-value, .emu-caller-cat-telemetry .kind-drug.has-value { color: #86cf32 !important; }
      .emu-caller-cat-telemetry .kind-booster.has-value { color: #e8bd55 !important; }
      .emu-caller-cat-telemetry .kind-medical.has-value { color: #8fcfff !important; }
      .members-list[data-emu-caller-cat="true"] { overflow-x: auto !important; overflow-y: visible !important; }
      .faction-war .members-list[data-emu-caller-cat-source="true"], [data-emu-caller-cat-native-header="true"], [data-emu-caller-native-member-header="true"] { display: none !important; }
      .faction-war.emu-caller-compact-war .members-list[data-emu-war-table-inactive="true"] { display: none !important; }
      .emu-caller-cat-board { display: grid !important; grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important; align-items: start !important; clear: both !important; float: none !important; position: relative !important; box-sizing: border-box !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important; overflow: hidden !important; background: #303030 !important; border-top: 1px solid #555 !important; }
      .emu-caller-cat-board[data-emu-caller-compact="true"] { grid-template-columns: minmax(0,1fr) !important; }
      .emu-caller-cat-board[data-emu-caller-panel-count="1"] { grid-template-columns: minmax(0,1fr) !important; }
      .emu-caller-cat-panel { display: block !important; float: none !important; box-sizing: border-box !important; width: auto !important; min-width: 0 !important; max-width: none !important; overflow: hidden !important; border-right: 1px solid #1d1d1d !important; }
      .emu-caller-cat-panel-title { box-sizing: border-box !important; height: 27px !important; padding: 6px 8px !important; overflow: hidden !important; background: #353535 !important; color: #df8f6d !important; font: 900 12px Arial,sans-serif !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
      .emu-caller-cat-panel[data-side="own"] .emu-caller-cat-panel-title { color: #8ebd28 !important; }
      .emu-caller-cat-body { display: block !important; min-width: 0 !important; }
      .emu-caller-cat-empty { box-sizing: border-box !important; min-height: 35px !important; padding: 10px !important; color: #aaa !important; font: 700 10px Arial,sans-serif !important; }
      .emu-caller-row-tools { display: inline-flex; gap: 3px; margin: 0 4px; padding: 0; vertical-align: middle; }
      .faction-war .emu-caller-row-tools { float: left !important; width: 79px !important; height: 24px !important; box-sizing: border-box !important; margin: 5px 2px !important; padding: 0 !important; line-height: 24px !important; }
      .emu-caller-call-button, .emu-caller-group-button { display: inline-flex; align-items: center; justify-content: center; min-width: 42px; min-height: 22px; color: white; border-radius: 3px; font-size: 10px; font-weight: 900; vertical-align: middle; cursor: pointer; }
      .faction-war .emu-caller-call-button { width: 52px !important; min-width: 52px !important; height: 24px !important; min-height: 24px !important; box-sizing: border-box !important; margin: 0 !important; padding: 0 2px !important; font-size: 9px !important; line-height: 22px !important; }
      .emu-caller-pin-button { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 24px; min-width: 24px; height: 24px; padding: 0; border: 1px solid #777; border-radius: 3px; background: #292929; color: #bbb; font-size: 15px; line-height: 22px; cursor: pointer; }
      .emu-caller-pin-button.active { border-color: #ffd45c; background: #59430c; color: #ffe486; }
      .emu-caller-call-button { border: 1px solid #5bbcff; background: #198bd1; }
      .emu-caller-call-button.called { border-color: #d6a8ff; background: #55257e; color: #f4e5ff; }
      .emu-caller-call-button.called.own { border-color: #7eea91; background: #1e7134; color: #eaffed; }
      .emu-caller-call-button.claimed { font-size: 8px !important; }
      .emu-caller-group-button { border: 1px solid #c27bff; background: #562280; }
      .emu-caller-group-button.called { border-color: #dba9ff; background: #421768; color: #f7e8ff; }
      .emu-caller-call-button:disabled, .emu-caller-group-button:disabled { opacity: .62; cursor: default; }
      .emu-caller-called-row, .emu-caller-other-called-row { outline: 1px solid rgba(184,106,255,.8) !important; box-shadow: inset 0 0 0 9999px rgba(86,33,138,.12); }
      .emu-caller-own-called-row { outline: 1px solid rgba(95,224,119,.9) !important; box-shadow: inset 0 0 0 9999px rgba(28,126,51,.14) !important; }
      .emu-caller-pinned-row { box-shadow: inset 3px 0 #ffd45c !important; }
      #emu-caller-attack-hint.complete { border-color: #72d980; color: #eaffec; background: linear-gradient(#36543a, #1d3020); }
      .emu-caller-row-marker { display: inline-block; margin-left: 5px; color: #dba5ff; font-size: 11px; font-weight: 800; }
      .emu-caller-random-pick { outline: 2px solid #fff66a !important; }
      .emu-caller-attack-bar-host { position: relative !important; min-height: 42px !important; }
      #emu-caller-attack-hint { display: flex; flex-wrap: nowrap; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; margin: 8px auto; padding: 4px 6px; border: 1px solid #555; border-radius: 3px; color: #ddd; background: linear-gradient(#454545, #252525); box-shadow: inset 0 1px rgba(255,255,255,.08), 0 1px 2px rgba(0,0,0,.65); font: 800 11px Arial, sans-serif; text-align: center; white-space: nowrap; }
      #emu-caller-attack-hint.fallback { position: relative; z-index: 25; width: max-content; max-width: calc(100% - 16px); }
      #emu-caller-attack-hint.pinned { position: absolute; z-index: 25; top: 50%; left: 50%; width: max-content; max-width: calc(100% - 260px); margin: 0; transform: translate(-50%, -50%); }
      #emu-caller-attack-hint.requested { min-width: 260px; }
      .emu-caller-chain-text { color: #a7c8ff; }
      .emu-caller-chain-text.bonus-soon { color: #ffbd5a; }
      .emu-caller-chain-text.bonus-now { color: #7dff8a; text-shadow: 0 0 8px rgba(125,255,138,.55); }
      .emu-caller-rally-buttons { display: inline-flex; flex-wrap: nowrap; align-items: center; justify-content: center; gap: 7px; }
      .emu-caller-rally-group { display: inline-flex; align-items: center; gap: 3px; }
      .emu-caller-rally-group b { margin-right: 2px; color: #b7f8c8; font-size: 10px; text-transform: uppercase; text-shadow: 0 1px #000; }
      .emu-caller-rally-buttons button { min-width: 32px; height: 24px; border-radius: 3px; padding: 2px 6px; font-weight: 900; box-shadow: inset 0 1px rgba(255,255,255,.12); }
      .emu-caller-rally-group.faction b { color: #8dff96; }
      .emu-caller-rally-group.alliance b { color: #e2b7ff; }
      .emu-caller-rally-group.faction button { border: 1px solid #6fe58c; background: #124d26; color: #dfffe5; }
      .emu-caller-rally-group.alliance button { border: 1px solid #c27bff; background: #281140; color: #f2d8ff; }
      .emu-caller-rally-buttons button:disabled { opacity: .45; }
      .emu-caller-help-requested { display: inline-flex; align-items: baseline; gap: 8px; color: #cfe8c0; text-shadow: 0 1px #000; }
      .emu-caller-help-requested b { color: #9ac85a; }
      .emu-caller-help-requested small { color: #bbb; font-size: 10px; }
      .emu-caller-cancel-rally { height: 24px; border: 1px solid #8e4242; border-radius: 3px; background: linear-gradient(#7b3434, #482020); color: #fff; padding: 2px 9px; font-weight: 900; }
      .emu-caller-cancel-rally:disabled { opacity: .45; }
      #emu-caller-rally-toasts { position: fixed; right: 10px; bottom: 72px; z-index: 1000000; display: grid; gap: 8px; width: min(330px, calc(100vw - 20px)); font-family: Arial, sans-serif; }
      .emu-caller-toast-drag-handle { min-height: 20px; margin: -5px -4px 7px; border-bottom: 1px solid rgba(255,255,255,.14); border-radius: 3px 3px 0 0; background: rgba(255,255,255,.055); color: #cbd3cd; padding: 6px 7px 4px; font-size: 9px; font-weight: 900; letter-spacing: 1px; text-align: right; text-transform: uppercase; touch-action: none; user-select: none; cursor: grab; }
      #emu-caller-rally-toasts[data-emu-caller-dragging="true"] .emu-caller-toast-drag-handle { cursor: grabbing; }
      .emu-caller-rally-toast { border: 1px solid #c27bff; background: rgba(18, 11, 28, .96); color: #f2d8ff; box-shadow: 0 0 18px rgba(0,0,0,.65); padding: 9px 10px; border-radius: 4px; }
      .emu-caller-rally-toast strong, .emu-caller-rally-toast span, .emu-caller-rally-toast small { display: block; margin-bottom: 4px; }
      .emu-caller-rally-toast small { color: #b7f8c8; }
      .emu-caller-rally-toast button { margin: 4px 6px 0 0; border: 1px solid #6fe58c; background: #0a1f12; color: #9fffaa; padding: 5px 8px; font-weight: 800; }
      .emu-caller-rally-toast.scope-faction:not(.emu-caller-announcement-toast) { border-color: #6fe58c; background: rgba(7, 37, 17, .97); color: #dfffe5; box-shadow: 0 0 18px rgba(55,210,97,.32); }
      .emu-caller-rally-toast.scope-faction:not(.emu-caller-announcement-toast) strong { color: #8dff96; }
      .emu-caller-rally-toast.scope-alliance { border-color: #c27bff; background: rgba(31, 13, 48, .97); color: #f2d8ff; box-shadow: 0 0 18px rgba(151,77,218,.32); }
      .emu-caller-rally-toast.scope-alliance strong, .emu-caller-rally-toast.scope-alliance small { color: #e2b7ff; }
      .emu-caller-announcement-composer { margin: 10px 0; padding: 10px; border: 1px solid rgba(242,201,76,.65); border-radius: 4px; background: rgba(35,29,8,.72); }
      .emu-caller-announcement-composer p { margin: 0 0 7px; color: #e6dcae; font-size: 11px; }
      .emu-caller-announcement-composer textarea { display: block; box-sizing: border-box; width: 100%; min-height: 62px; resize: vertical; border: 1px solid #827238; border-radius: 3px; background: #0d0c07; color: #fff; padding: 8px; font: 12px/1.35 Arial,sans-serif; }
      .emu-caller-announcement-composer small { display: block; margin-top: 7px; color: #baae7d; font-size: 10px; }
      .emu-caller-announcement-composer button:disabled { opacity: .55; cursor: not-allowed; }
      .emu-caller-announcement-composer[data-announcement-ready="true"] small { color: #aaffb7; }
      .emu-caller-announcement-reader { margin: 0 0 8px; padding: 8px 9px; border: 1px solid rgba(242,201,76,.55); border-radius: 4px; background: rgba(38,29,5,.72); }
      .emu-caller-announcement-reader strong, .emu-caller-announcement-reader span { display: block; }
      .emu-caller-announcement-reader strong { color: #ffd95a; font-size: 13px; }
      .emu-caller-announcement-reader span { margin-top: 3px; color: #d8c985; font-size: 10px; }
      .emu-caller-announcement-feed { display: grid; gap: 7px; }
      .emu-caller-announcement-feed article { padding: 8px 9px; border-left: 3px solid #f2c94c; border-radius: 3px; background: rgba(38,29,5,.82); }
      .emu-caller-announcement-feed strong, .emu-caller-announcement-feed span, .emu-caller-announcement-feed small { display: block; }
      .emu-caller-announcement-feed strong { color: #ffd95a; font-size: 11px; }
      .emu-caller-announcement-feed span { margin-top: 3px; color: #fff; font-size: 12px; line-height: 1.35; overflow-wrap: anywhere; }
      .emu-caller-announcement-feed small { margin-top: 4px; color: #bdaa68; font-size: 9px; }
      .emu-caller-announcement-readonly { margin-top: 8px; color: #b9b18f; font-size: 10px; text-align: center; }
      .emu-caller-announcement-toast { border-color: #f2c94c; background: rgba(38,29,5,.97); color: #fff4c0; }
      .emu-caller-announcement-toast strong { color: #ffd95a; letter-spacing: .4px; }
      .emu-caller-announcement-toast span { color: #fff; line-height: 1.35; }
      .emu-caller-announcement-toast small { color: #d8c985; }
      .emu-caller-announcement-toast button[data-install-announcement-update] { border-color: #ffbf4f !important; background: #432b05 !important; color: #fff1bc !important; }
      .emu-caller-war-brief { margin: 0 0 10px; padding: 9px; border: 1px solid rgba(106,170,255,.65); border-radius: 4px; background: rgba(12,27,46,.88); }
      .emu-caller-war-brief-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
      .emu-caller-war-brief-head span { color: #85c4ff; font-size: 11px; font-weight: 900; text-transform: uppercase; }
      .emu-caller-war-brief-head small, .emu-caller-war-brief-current small, .emu-caller-war-brief-editor > small { color: #91a8bd; font-size: 9px; }
      .emu-caller-war-brief-current { padding: 8px 9px; border-left: 3px solid #5aaeff; border-radius: 3px; background: rgba(5,15,27,.86); }
      .emu-caller-war-brief-current strong, .emu-caller-war-brief-current small { display: block; }
      .emu-caller-war-brief-current strong { color: #fff; font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
      .emu-caller-war-brief-current small { margin-top: 4px; }
      .emu-caller-war-brief-empty { padding: 8px 9px; color: #91a8bd; font-size: 10px; background: rgba(5,15,27,.65); }
      .emu-caller-war-brief-editor { margin-top: 8px; }
      .emu-caller-war-brief-editor textarea { display: block; box-sizing: border-box; width: 100%; min-height: 58px; resize: vertical; border: 1px solid #426b94; border-radius: 3px; background: #07111d; color: #fff; padding: 8px; font: 11px/1.4 Arial,sans-serif; }
      .emu-caller-war-brief-editor > small { display: block; margin-top: 5px; }
      .emu-caller-war-brief-toast { border-color: #5aaeff !important; background: rgba(7,22,39,.98) !important; }
      .emu-caller-war-brief-toast strong { color: #85c4ff !important; }
      .emu-caller-war-mode-card { display: grid; gap: 6px; margin: 0 0 10px; padding: 10px; border: 1px solid; border-radius: 4px; }
      .emu-caller-war-mode-card.term { border-color: rgba(91,211,132,.65); background: linear-gradient(135deg,rgba(14,54,31,.94),rgba(9,31,21,.94)); }
      .emu-caller-war-mode-card.real { border-color: rgba(255,79,94,.78); background: linear-gradient(135deg,rgba(75,16,23,.96),rgba(39,8,13,.96)); }
      .emu-caller-war-mode-head, .emu-caller-war-mode-goal > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .emu-caller-war-mode-head span { font-size: 10px; font-weight: 900; letter-spacing: .7px; text-transform: uppercase; }
      .emu-caller-war-mode-head strong { padding: 2px 6px; border: 1px solid currentColor; border-radius: 10px; font-size: 8px; }
      .emu-caller-war-mode-card.term .emu-caller-war-mode-head, .emu-caller-war-mode-card.term h3 { color: #8ff0ad; }
      .emu-caller-war-mode-card.real .emu-caller-war-mode-head, .emu-caller-war-mode-card.real h3 { color: #ff7d88; }
      .emu-caller-war-mode-card h3, .emu-caller-war-mode-card p { margin: 0; }
      .emu-caller-war-mode-card h3 { font-size: 14px; line-height: 1.3; }
      .emu-caller-war-mode-card p { color: #d1d9d4; font-size: 10px; line-height: 1.35; }
      .emu-caller-war-mode-goal { display: grid; gap: 4px; padding: 7px 8px; border: 1px solid rgba(255,255,255,.12); border-radius: 4px; background: rgba(0,0,0,.24); }
      .emu-caller-war-mode-goal span, .emu-caller-war-mode-goal strong { color: #e9fff0; font-size: 10px; }
      .emu-caller-war-mode-goal small { color: #b8cabc; font-size: 9px; }
      .emu-caller-war-mode-track { height: 7px; overflow: hidden; border-radius: 5px; background: rgba(255,255,255,.12); }
      .emu-caller-war-mode-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#30bd6c,#8ff0ad); }
      .emu-caller-update-toast { border-color: #ffbd4a !important; background: rgba(42,29,5,.98) !important; color: #fff3cb !important; box-shadow: 0 0 20px rgba(255,178,49,.35) !important; }
      .emu-caller-update-toast strong { color: #ffd36b !important; letter-spacing: .5px; }
      .emu-caller-update-toast small { color: #e0c98f !important; }
      .emu-caller-update-toast button[data-install-companion-update] { border-color: #ffbf4f !important; background: #432b05 !important; color: #fff1bc !important; }
      .emu-caller-update-guidance { display: block; line-height: 1.35; }
      .emu-caller-update-card { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 6px; padding: 8px; border: 1px solid #36684a; border-radius: 4px; background: #142b1d; }
      .emu-caller-update-card.pending { border-color: #5d4a20; background: #2b240f; }
      .emu-caller-update-card > div { min-width: 88px; }
      .emu-caller-update-card span, .emu-caller-update-card strong { display: block; }
      .emu-caller-update-card span { color: #8eb69c; font-size: 9px; text-transform: uppercase; }
      .emu-caller-update-card strong { color: #9cf3b7; font-size: 12px; }
      .emu-caller-update-card.pending span { color: #c9b779; }
      .emu-caller-update-card.pending strong { color: #ffe39a; }
      .emu-caller-update-card button { flex: 0 0 auto; border: 1px solid #b48a2d; border-radius: 3px; background: #4b3609; color: #fff1bd; padding: 6px 9px; font-weight: 800; cursor: pointer; }
      .emu-caller-update-card small { flex: 1 1 150px; color: #9fc1aa; font-size: 9px; line-height: 1.35; }
      .emu-caller-update-card.pending small { color: #c9ba87; }
      #emu-caller-quick-revive { display: inline-flex !important; flex: 0 0 auto !important; align-items: center; justify-content: center; box-sizing: border-box !important; width: auto !important; min-width: 166px !important; max-width: none !important; min-height: 26px !important; height: 26px !important; margin: 2px 0 2px 8px !important; padding: 2px 12px !important; overflow: visible !important; border: 1px solid #7b241c !important; border-radius: 999px !important; background: linear-gradient(#c0392b,#922b21) !important; color: #fff !important; box-shadow: 0 1px 3px rgba(0,0,0,.36) !important; font: 700 10px/20px Arial,sans-serif !important; letter-spacing: .1px; text-shadow: 0 1px 1px rgba(0,0,0,.35); white-space: nowrap !important; vertical-align: middle; cursor: pointer; touch-action: manipulation; }
      #emu-caller-quick-revive:hover:not(:disabled) { filter: brightness(1.1); }
      #emu-caller-quick-revive:disabled { opacity: .72; cursor: default; }
      #emu-caller-quick-revive[data-state="success"] { opacity: 1 !important; border-color: #8d1d15 !important; background: linear-gradient(#eb5142,#a9241a) !important; box-shadow: 0 0 8px rgba(235,81,66,.55) !important; }
      #emu-caller-quick-revive[data-state="error"] { border-color: #4a5555 !important; background: linear-gradient(#7f8c8d,#566566) !important; }
      .emu-caller-faction-facts > .wide { grid-column: 1 / -1; }
      .emu-caller-faction-comparison { display: grid; gap: 3px; margin: 9px 0; padding: 9px 10px; border: 1px solid rgba(137,195,43,.4); border-radius: 3px; background: rgba(29,42,21,.72); }
      .emu-caller-faction-comparison strong { color: #c8f27c; font-size: 11px; }
      .emu-caller-faction-comparison span { color: #abb5a3; font-size: 9px; line-height: 1.35; }
      .emu-caller-territory-toast { border-color: #ff5364; background: rgba(46,8,14,.98); color: #fff; box-shadow: 0 0 22px rgba(255,45,70,.42); }
      .emu-caller-territory-toast > strong { color: #ff7886; letter-spacing: .8px; }
      .emu-caller-territory-toast > span { color: #fff; line-height: 1.4; }
      .emu-caller-territory-toast > small { color: #ffc2c8; }
      .emu-caller-territory-toast button[data-view-territory] { border-color: #ff6474; background: #3a0c13; color: #fff; }
      .emu-caller-territory-faction { display: inline !important; margin: 0 !important; font-weight: 900; }
      .emu-caller-territory-faction.alliance { color: #d297ff; }
      .emu-caller-territory-faction.enemy { color: #ff6474; }
      #emu-war-caller-root.inline { position: relative !important; right: auto !important; top: auto !important; width: 100% !important; max-width: 100% !important; margin: 0 0 10px !important; overflow: hidden; border-radius: 0 0 4px 4px; color: #ddd; background: #303030; box-shadow: 0 2px 5px rgba(0,0,0,.55); font-family: Arial, sans-serif; }
      #emu-war-caller-root.inline #emu-war-caller-button, #emu-war-caller-root.inline .emu-caller-head { display: none !important; }
      #emu-war-caller-root.inline #emu-war-caller-panel { display: block !important; box-sizing: border-box; width: 100% !important; max-height: none !important; overflow: visible !important; margin: 0 !important; border: 0 !important; border-radius: 0 0 4px 4px; background: #303030 !important; box-shadow: none !important; }
      #emu-war-caller-root.inline .emu-caller-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)) 36px 36px; height: 31px; border: 1px solid #181818; border-bottom: 0; background: #252525; }
      #emu-war-caller-root.inline .emu-caller-tabs button { box-sizing: border-box; height: 30px; margin: 0; padding: 0 3px !important; border: 0; border-right: 1px solid #151515; border-left: 1px solid rgba(255,255,255,.08); border-radius: 0; background: linear-gradient(#575757 0%, #3c3c3c 48%, #252525 52%, #202020 100%) !important; color: #f4f4f4 !important; font-size: 11px !important; font-weight: 700; line-height: 30px; text-shadow: 0 1px #000; box-shadow: inset 0 1px rgba(255,255,255,.12); }
      #emu-war-caller-root.inline .emu-caller-tabs button:first-child { border-left: 0; }
      #emu-war-caller-root.inline .emu-caller-tabs button:last-child { border-right: 0; }
      #emu-war-caller-root.inline .emu-caller-tabs button:hover { background: linear-gradient(#666, #2a2a2a) !important; }
      #emu-war-caller-root.inline .emu-caller-tabs button.active { background: linear-gradient(#202020, #383838) !important; color: #fff !important; box-shadow: inset 0 -2px #7ba41b, inset 0 1px rgba(255,255,255,.08); }
      #emu-war-caller-root.universal-inline.collapsed #emu-caller-status, #emu-war-caller-root.universal-inline.collapsed #emu-caller-tab-body { display: none !important; }
      #emu-war-caller-root.universal-inline.collapsed #emu-war-caller-panel { border-radius: 0 0 4px 4px; }
      #emu-war-caller-root.inline #emu-caller-status { box-sizing: border-box; padding: 6px 10px; border: 1px solid #1b1b1b; border-top: 0; background: #252525; color: #94bf36; font-size: 10px; line-height: 14px; }
      #emu-war-caller-root.inline #emu-caller-tab-body { box-sizing: border-box; min-height: 64px; padding: 10px; border: 1px solid #1b1b1b; border-top: 0; background: #303030; color: #d6d6d6; }
      #emu-war-caller-root.inline .emu-caller-page-title, #emu-war-caller-root.inline .emu-caller-section-title { margin: 0 0 7px; color: #8fc400; font-size: 10px; font-weight: 900; letter-spacing: .25px; text-transform: uppercase; }
      #emu-war-caller-root.inline .emu-caller-faction-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      #emu-war-caller-root.inline .emu-caller-faction-card h3 { margin: 0; padding: 5px 10px; border-radius: 3px 3px 0 0; background: linear-gradient(#515151,#343434); color: #eee; font-size: 13px; }
      #emu-war-caller-root.inline .emu-caller-faction-name, #emu-war-caller-root.inline .emu-caller-leadership, #emu-war-caller-root.inline .emu-caller-faction-facts > div { margin-top: 7px; padding: 8px 10px; border-radius: 3px; background: #252525; }
      #emu-war-caller-root.inline .emu-caller-faction-card span, #emu-war-caller-root.inline .emu-caller-plan-grid span, #emu-war-caller-root.inline .emu-caller-control-row span { display: block; color: #929292; font-size: 9px; text-transform: uppercase; }
      #emu-war-caller-root.inline .emu-caller-faction-name strong { display: block; margin-top: 3px; font-size: 15px; }
      #emu-war-caller-root.inline .emu-caller-faction-card.enemy .emu-caller-faction-name strong, #emu-war-caller-root.inline .emu-caller-faction-card.enemy .emu-caller-faction-facts strong { color: #ff6548; }
      #emu-war-caller-root.inline .emu-caller-faction-card.own .emu-caller-faction-name strong, #emu-war-caller-root.inline .emu-caller-faction-card.own .emu-caller-faction-facts strong { color: #93cf00; }
      #emu-war-caller-root.inline .emu-caller-leadership b { display: block; color: #ccc; font-size: 11px; }
      #emu-war-caller-root.inline .emu-caller-faction-facts { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 7px; }
      #emu-war-caller-root.inline .emu-caller-faction-facts strong { display: block; margin-top: 2px; font-size: 15px; }
      #emu-war-caller-root.inline .emu-caller-plan-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin-bottom: 9px; }
      #emu-war-caller-root.inline .emu-caller-plan-grid > div, #emu-war-caller-root.inline .emu-caller-control-row { padding: 9px 10px; border-radius: 3px; background: #252525; }
      #emu-war-caller-root.inline .emu-caller-plan-grid strong { color: #ddd; }
      #emu-war-caller-root.inline .emu-caller-control-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
      #emu-war-caller-root.inline .emu-caller-control-row strong { color: #ff6b62; font-size: 11px; text-transform: uppercase; }
      #emu-war-caller-root.inline .emu-caller-enabled-label { color: #8fc400; }
      .emu-caller-switch input { display: none; }
      .emu-caller-switch i { display: block; position: relative; width: 30px; height: 17px; border-radius: 10px; background: #555; }
      .emu-caller-switch i::after { content: ""; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #ddd; transition: left .15s; }
      .emu-caller-switch input:checked + i { background: #86c900; }
      .emu-caller-switch input:checked + i::after { left: 15px; background: #fff; }
      #emu-war-caller-root.inline .emu-caller-chain-card { padding: 12px; border-radius: 3px; background: #252525; }
      #emu-war-caller-root.inline .emu-caller-chain-card strong, #emu-war-caller-root.inline .emu-caller-chain-card span { display: block; }
      #emu-war-caller-root.inline .emu-caller-chain-card span { margin: 4px 0 10px; color: #999; }
      #emu-war-caller-root.inline .emu-caller-chain-card > div { height: 4px; background: #3b3b3b; }
      #emu-war-caller-root.inline .emu-caller-chain-card i { display: block; height: 100%; background: #86c900; }
      .emu-caller-shared-order { display: grid; gap: 3px; margin-bottom: 9px; padding: 9px; border: 1px solid rgba(132,197,38,.6); border-radius: 3px; background: rgba(31,54,16,.85); }
      .emu-caller-shared-order span { color: #a9d46a; font-size: 9px; font-weight: 900; text-transform: uppercase; }
      .emu-caller-shared-order strong { color: #d8ff9b; font-size: 15px; }
      .emu-caller-shared-order small { color: #c5cfb8; font-size: 9px; }
      .emu-caller-shared-order p { margin: 3px 0 0; color: #fff; font-size: 10px; }
      #emu-war-caller-root.inline .emu-caller-chain-settings { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin: 10px 0; }
      #emu-war-caller-root.inline .emu-caller-chain-settings section { padding: 10px; border-radius: 3px; background: #383838; }
      #emu-war-caller-root.inline .emu-caller-chain-settings p { margin: 5px 0 0; color: #929292; }
      #emu-war-caller-root.inline .emu-caller-stats-chart { display: flex; align-items: end; gap: 4px; height: 125px; padding: 12px 12px 20px; border-radius: 3px; background: #263246; }
      #emu-war-caller-root.inline .emu-caller-stats-chart > span { display: flex; position: relative; flex: 1; align-items: end; height: 100%; border-bottom: 1px solid #60807b; }
      #emu-war-caller-root.inline .emu-caller-stats-chart i { display: block; width: 100%; min-height: 2px; background: #73d4a6; }
      #emu-war-caller-root.inline .emu-caller-stats-chart small { position: absolute; top: 100%; left: 50%; color: #7f8fa8; font-size: 8px; transform: translateX(-50%); }
      #emu-war-caller-root.inline .emu-caller-stats-legend { padding: 6px 0; color: #aaa; font-size: 9px; }
      #emu-war-caller-root.inline .emu-caller-stats-legend i { display: inline-block; width: 13px; height: 2px; margin-right: 4px; background: #73d4a6; vertical-align: middle; }
      #emu-war-caller-root.inline .emu-caller-stat-summary { padding: 9px; border-radius: 3px; background: #3a3d48; }
      #emu-war-caller-root.inline .emu-caller-stat-summary strong, #emu-war-caller-root.inline .emu-caller-stat-summary span { display: block; }
      #emu-war-caller-root.inline .emu-caller-stat-summary strong { color: #a3d13f; }
      #emu-war-caller-root.inline .emu-caller-stat-summary span { margin-top: 4px; color: #aaa; font-size: 10px; }
      #emu-war-caller-root.inline .emu-caller-actions button, #emu-war-caller-root.inline .emu-caller-call-row button { border: 1px solid #161616; border-radius: 3px; background: linear-gradient(#5b5b5b,#303030); color: #eee; padding: 6px 10px; text-shadow: 0 1px #000; }
      #emu-war-caller-root.inline .emu-caller-label { color: #8fc400; font-size: 10px; text-transform: uppercase; }
      #emu-war-caller-root.inline .emu-caller-label input, #emu-war-caller-root.inline .emu-caller-label select { border: 1px solid #202020; border-radius: 3px; background: #222; color: #ddd; }
      #emu-war-caller-root.inline .emu-caller-quick-key, #emu-war-caller-root.inline .emu-caller-provider-box, #emu-war-caller-root.inline .emu-caller-call-row, #emu-war-caller-root.inline .emu-caller-event-row { border: 0; border-radius: 3px; background: #383838; }
      #emu-war-caller-root.inline .emu-caller-empty { padding: 12px; border-radius: 3px; background: #252525; color: #999; }
      #emu-war-caller-root.inline .emu-caller-help p { margin: 0 0 7px; padding: 9px; border-radius: 3px; background: #383838; color: #ccc; }
      #emu-war-caller-root:not(.inline) .emu-caller-page-title, #emu-war-caller-root:not(.inline) .emu-caller-section-title { margin: 0 0 7px; color: #8fc400; font-size: 10px; font-weight: 900; letter-spacing: .25px; text-transform: uppercase; }
      #emu-war-caller-root:not(.inline) .emu-caller-faction-pair { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
      #emu-war-caller-root:not(.inline) .emu-caller-faction-card { min-width: 0; }
      #emu-war-caller-root:not(.inline) .emu-caller-faction-card h3 { margin: 0; padding: 6px 8px; border-radius: 3px 3px 0 0; background: linear-gradient(#515151,#343434); color: #eee; font-size: 12px; }
      #emu-war-caller-root:not(.inline) .emu-caller-faction-name, #emu-war-caller-root:not(.inline) .emu-caller-leadership, #emu-war-caller-root:not(.inline) .emu-caller-faction-facts > div { margin-top: 6px; padding: 7px 8px; border-radius: 3px; background: #252525; }
      #emu-war-caller-root:not(.inline) .emu-caller-faction-card span { display: block; color: #929292; font-size: 9px; text-transform: uppercase; }
      #emu-war-caller-root:not(.inline) .emu-caller-faction-name strong, #emu-war-caller-root:not(.inline) .emu-caller-faction-facts strong { display: block; margin-top: 2px; font-size: 14px; }
      #emu-war-caller-root:not(.inline) .emu-caller-faction-card.enemy strong { color: #ff765b; }
      #emu-war-caller-root:not(.inline) .emu-caller-faction-card.own strong { color: #93cf00; }
      #emu-war-caller-root:not(.inline) .emu-caller-leadership b { display: block; overflow-wrap: anywhere; color: #ccc; font-size: 10px; }
      #emu-war-caller-root:not(.inline) .emu-caller-faction-facts { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 6px; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-card { padding: 10px; border-radius: 3px; background: #252525; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-card strong, #emu-war-caller-root:not(.inline) .emu-caller-chain-card span { display: block; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-card span { margin: 4px 0 8px; color: #999; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-card > div { height: 4px; background: #3b3b3b; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-card i { display: block; height: 100%; background: #86c900; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-settings { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin: 10px 0; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-settings section { padding: 9px; border-radius: 3px; background: #383838; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-settings p { margin: 5px 0 0; color: #929292; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-slider { display: flex; align-items: center; gap: 8px; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-slider input { flex: 1; min-width: 0; accent-color: #86c900; }
      #emu-war-caller-root:not(.inline) .emu-caller-chain-slider output { min-width: 34px; color: #9bea31; font-weight: 700; text-align: right; }
      #emu-war-caller-root:not(.inline) .emu-caller-stats-chart { display: flex; align-items: end; gap: 4px; height: 105px; padding: 10px 10px 18px; border-radius: 3px; background: #263246; }
      #emu-war-caller-root:not(.inline) .emu-caller-stats-chart > span { display: flex; position: relative; flex: 1; align-items: end; height: 100%; border-bottom: 1px solid #60807b; }
      #emu-war-caller-root:not(.inline) .emu-caller-stats-chart i { display: block; width: 100%; min-height: 2px; background: #73d4a6; }
      #emu-war-caller-root:not(.inline) .emu-caller-stats-chart small { position: absolute; top: 100%; left: 50%; color: #7f8fa8; font-size: 7px; transform: translateX(-50%); }
      #emu-war-caller-root:not(.inline) .emu-caller-stat-summary { padding: 9px; border-radius: 3px; background: #3a3d48; }
      #emu-war-caller-root:not(.inline) .emu-caller-stat-summary strong, #emu-war-caller-root:not(.inline) .emu-caller-stat-summary span { display: block; }
      #emu-war-caller-root:not(.inline) .emu-caller-help p { margin: 0 0 7px; padding: 9px; border-radius: 3px; background: #383838; color: #ccc; }
      .emu-caller-torn-chain-header { display: flex !important; align-items: center !important; gap: 6px; }
      .emu-caller-torn-chain-target, .emu-caller-torn-favourite-target { min-width: 0; padding: 2px 7px; border: 1px solid rgba(183,232,88,.8); border-radius: 3px; background: rgba(18,29,14,.88); color: #d8f6a0; font: 700 10px/16px Arial,sans-serif; white-space: nowrap; cursor: pointer; }
      .emu-caller-torn-chain-target { margin-left: auto; }
      .emu-caller-torn-favourite-target { margin-left: 4px; border-color: rgba(255,212,92,.85); background: rgba(61,44,7,.9); color: #ffe486; }
      .emu-caller-torn-chain-target:hover, .emu-caller-torn-favourite-target:hover { background: rgba(62,91,30,.95); color: #fff; }
      .emu-caller-chain-bsp-host { position: relative !important; }
      .emu-caller-chain-attack-bsp { display: block; position: absolute; top: 50%; left: 1px; z-index: 100; width: 32px; height: 14px; margin: 0; padding: 0; border: 0; background: transparent; box-sizing: border-box; transform: translateY(-50%); pointer-events: none; }
      .emu-caller-chain-attack-bsp .emu-caller-faction-bsp-value { width: 32px !important; min-width: 32px !important; max-width: 32px !important; height: 14px !important; min-height: 14px !important; padding: 0 1px !important; border-radius: 2px !important; box-sizing: border-box !important; overflow: hidden !important; font-size: 8px !important; line-height: 12px !important; letter-spacing: -.1px !important; white-space: nowrap; }
      #emu-caller-chain-flash-overlay { display: none; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; background: rgba(255,0,0,.24); }
      #emu-caller-chain-flash-overlay.active { display: block; animation: emuCallerScreenFlash .65s ease-in-out infinite; }
      #emu-caller-chain-flash-overlay.test { display: block; animation: emuCallerScreenFlash .3s 4; }
      @keyframes emuCallerScreenFlash { 0%,100% { opacity: 0; } 50% { opacity: 1; } }
      @media (max-width: 700px) {
        #emu-war-caller-root { right: 8px; top: 66px; }
        #emu-war-caller-root.emu-caller-overseas-launcher { right: 8px !important; top: 66px !important; }
        #emu-war-caller-panel { width: calc(100vw - 16px); max-height: calc(100vh - 110px); }
        #emu-war-caller-root:not(.inline) .emu-caller-faction-pair, #emu-war-caller-root:not(.inline) .emu-caller-chain-settings { grid-template-columns: 1fr; }
        .emu-caller-cat-strip { grid-template-columns: minmax(52px, .95fr) minmax(42px, .62fr) minmax(36px, .55fr) minmax(52px, .9fr) minmax(56px, .72fr) auto auto; gap: 2px; margin: 0 2px; }
        .emu-caller-cat-name { max-width: 72px; font-size: 9px; }
        .emu-caller-bsp-slot, .emu-caller-score-slot, .emu-caller-status-slot, .emu-caller-detail-slot { min-height: 16px; padding: 1px 3px; font-size: 9px; }
        .emu-caller-detail-chip { font-size: 8px; }
        .emu-caller-call-button, .emu-caller-group-button { min-width: 34px; min-height: 20px; padding: 1px 3px; font-size: 9px; }
        .faction-war .emu-caller-row-tools { width: 32px !important; margin-left: 1px !important; margin-right: 1px !important; }
        .faction-war .emu-caller-call-button { width: 32px !important; min-width: 32px !important; font-size: 8px !important; }
        .faction-war .members-list[data-emu-caller-bsp="true"] .attack { width: 66px !important; }
        .faction-war .members-list[data-emu-caller-controls="true"] .attack, [data-emu-caller-controls-header="true"] > .attack { width: 74px !important; }
        .emu-caller-cat-row[data-side="enemy"], .emu-caller-cat-header[data-side="enemy"] { grid-template-columns: minmax(86px,1fr) 43px 36px 52px 68px 30px !important; }
        .emu-caller-cat-row[data-side="own"], .emu-caller-cat-header[data-side="own"] { grid-template-columns: minmax(78px,1fr) 40px 34px 48px 27px 27px 27px 28px !important; }
        .emu-caller-cat-board { grid-template-columns: minmax(0,1fr) !important; min-width: 0 !important; }
        #emu-caller-attack-hint.pinned { top: 100%; max-width: calc(100vw - 20px); transform: translate(-50%, 2px); }
        .emu-caller-attack-bar-host { margin-bottom: 40px !important; }
        .emu-caller-rally-buttons { gap: 3px; }
        .emu-caller-rally-group { gap: 2px; }
        .emu-caller-rally-buttons button { min-width: 27px; padding: 1px 3px; font-size: 9px; }
        #emu-caller-rally-toasts { bottom: 90px; }
        #emu-war-caller-root.inline .emu-caller-tabs { grid-template-columns: repeat(5,minmax(0,1fr)) 30px 30px; }
        #emu-war-caller-root.inline .emu-caller-tabs button { padding: 0 1px !important; font-size: 8px !important; }
        #emu-war-caller-root.inline .emu-caller-faction-pair, #emu-war-caller-root.inline .emu-caller-chain-settings { grid-template-columns: 1fr; }
        #emu-war-caller-root.inline .emu-caller-plan-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
      }

      /* Native Torn ranked-war augmentation. Keep Torn's panels and rows; only add caller data. */
      .faction-war [data-emu-caller-native-header="true"],
      .faction-war [data-emu-caller-native-row="true"] {
        display: flex !important;
        align-items: center !important;
        box-sizing: border-box !important;
        width: 100% !important;
        min-width: 0 !important;
      }
      .faction-war [data-emu-caller-native-header="true"] { min-height: 28px; }
      .faction-war [data-emu-caller-native-row="true"] { min-height: 36px; }
      .faction-war [data-emu-caller-native-header="true"] > *,
      .faction-war [data-emu-caller-native-row="true"] > * {
        float: none !important;
        box-sizing: border-box !important;
        min-width: 0 !important;
        flex: 0 0 auto !important;
      }
      .faction-war [data-emu-caller-native-header="true"] > :first-child,
      .faction-war [data-emu-caller-native-row="true"] > :first-child,
      .faction-war [data-emu-caller-native-row="true"] > .member,
      .faction-war [data-emu-caller-native-row="true"] > [class*="member___"],
      .faction-war [data-emu-caller-native-row="true"] > [class*="user___"] {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 76px !important;
        max-width: 142px !important;
      }
      .faction-war [data-emu-caller-native-header="true"] > .level,
      .faction-war [data-emu-caller-native-header="true"] > .lvl,
      .faction-war [data-emu-caller-native-header="true"] > [class*="level___"],
      .faction-war [data-emu-caller-native-row="true"] > .level,
      .faction-war [data-emu-caller-native-row="true"] > .lvl,
      .faction-war [data-emu-caller-native-row="true"] > [class*="level___"] { display: none !important; }
      .faction-war .emu-caller-bsp-header,
      .faction-war .emu-caller-bsp-cell { width: 44px !important; flex-basis: 44px !important; padding: 0 2px !important; text-align: center !important; }
      .faction-war .emu-caller-clock-header {
        position: relative !important;
        z-index: 8 !important;
        display: block !important;
        float: none !important;
        width: 0 !important;
        min-width: 0 !important;
        height: 35px !important;
        flex: 0 0 0 !important;
        flex-basis: 0 !important;
        overflow: visible !important;
        padding: 0 !important;
        border: 0 !important;
      }
      .faction-war .emu-caller-clock-cell { display: none !important; width: 0 !important; min-width: 0 !important; flex: 0 0 0 !important; }
      .faction-war [data-emu-caller-native-header="true"] > .points,
      .faction-war [data-emu-caller-native-header="true"] > .score,
      .faction-war [data-emu-caller-native-header="true"] > [class*="points___"],
      .faction-war [data-emu-caller-native-header="true"] > [class*="score___"],
      .faction-war [data-emu-caller-native-row="true"] > .points,
      .faction-war [data-emu-caller-native-row="true"] > .score,
      .faction-war [data-emu-caller-native-row="true"] > [class*="points___"],
      .faction-war [data-emu-caller-native-row="true"] > [class*="score___"] { width: 58px !important; flex-basis: 58px !important; text-align: center !important; }
      .faction-war [data-emu-caller-native-header="true"] > .status,
      .faction-war [data-emu-caller-native-header="true"] > [class*="status___"],
      .faction-war [data-emu-caller-native-row="true"] > .status,
      .faction-war [data-emu-caller-native-row="true"] > [class*="status___"] {
        width: 56px !important;
        flex-basis: 56px !important;
        overflow: hidden !important;
        text-align: center !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .faction-war [data-emu-caller-native-header="true"] > .attack,
      .faction-war [data-emu-caller-native-header="true"] > [class*="attack___"],
      .faction-war [data-emu-caller-native-row="true"] > .attack,
      .faction-war [data-emu-caller-native-row="true"] > [class*="attack___"] { width: 116px !important; flex-basis: 116px !important; }
      .faction-war [data-emu-caller-native-header="true"][data-emu-caller-native-side="own"] > .attack,
      .faction-war [data-emu-caller-native-header="true"][data-emu-caller-native-side="own"] > [class*="attack___"],
      .faction-war [data-emu-caller-native-row="true"][data-emu-caller-native-side="own"] > .attack,
      .faction-war [data-emu-caller-native-row="true"][data-emu-caller-native-side="own"] > [class*="attack___"] { display: none !important; }
      .faction-war .emu-caller-native-last-header,
      .faction-war .emu-caller-native-last { display: none !important; }
      .faction-war .emu-caller-native-member-host { position: relative !important; display: block !important; overflow: hidden !important; }
      .faction-war .emu-caller-native-level {
        position: absolute !important;
        z-index: 7;
        left: 52px;
        right: 2px;
        bottom: 0;
        display: block;
        height: 10px;
        overflow: hidden;
        color: #aaa;
        font: 8px/10px Arial,sans-serif;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .faction-war .emu-caller-native-revive {
        display: inline-block !important;
        width: 9px !important;
        min-width: 9px !important;
        height: 9px !important;
        margin-left: 2px !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-size: 9px 9px !important;
        vertical-align: -1px !important;
      }
      .faction-war .emu-caller-native-revive.on { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHUSURBVDhPnZQ7b9RAFIW/Oystks1DyKuVkuwibROaNFRRUqbfFlGG/5COhi5N/gENvwFtndKIjmKRII0baFaxRGMo0PpSzMPX3qXhWPaM79xz5sxTjmaHCoCA8B8QQEFRXAzsFRKfFB8kkC1UkRB3+4QSXZNpH1cfS8L4dkURwPWEghPz6zmhQ2tMte9UIAzTJgxEEFicK/mkTxyaQKSbM+soJQScLFtOlm0XN6I2z2Ec7UsAyAvIJ/s7s6NwljjQ8CJFV9+B5YqZsxQPlYurbZgrpan7wkNErrNDjMgLmB7D9HmbBJrasxbn2hc17kaPnzx6G2P5BMYZnL7eAvB0Dj+/C+NM+fMbHmTCi5ct4wx+fBZEYHrsxR9OQI7mBxrFXr3zIk0Ntzcjltdbqo/Cr1rICmVx1o3i9sZxcRVWGNjcgcyeHaqq38HDFVheb8kLWK8czT2cXrasV47FWSeyejPyB0EEF7eXpk+Hpvbl5itsvglVKaw/CFXpyAuoStfjOACR4abwaO67eFPDp/d+8avSC39ZSbgx/IH3rf9wt7nzYrGMsMIRas9mz10QrErZIVloawwoyGweLsdwlUQMN/EOYqpp73UrSHIYOusqgzdVTewv48CzpQ4DMt0AAAAASUVORK5CYII=") !important; }
      .faction-war .emu-caller-native-revive.off { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAARCAYAAADQWvz5AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAALhSURBVDhPXZRPbBtVEMZ/M2s7+8dtZMcuieVajVDzT2qFgmvIFY7trWeEOALHHOBWpFy40UOlXsqVE3cQlYhyQoISWVFatUK1kZqoIjg2pTJrJ9kdDnlrLFYa7b6d98188+37VmoLCwYggIogZogInggKqMsJYFORAIkZZoaJoFkBdUBPhLwIeWBGBF+VGRFm3N1XneTzDidmqEx1zopkgECVQISiKpEIkSq+yxdUyQE5EUQEzah7GQvXOXTA240Gb0YRFzyPSJWNSoVPV1YoiJBXxXNY/X8RX4RQlaLnUVTlw6UlPlpepqjKu9Uqdzc2uNVocCUMyTtGORHUEyE3xSRQ5YLnURThoiqXgoC8CDcqFbZaLY7imK/abY7jmLwIHqBmaE6Egosg00KExShiMQwBWCuX+azZ5Hg04uvHj/ltMPhPdFXHyKnvixC4sbZaLd6r16lHEQBl32cwGvHNkyd0BwNmsiJuGgU0P8XIV6URhqyUy6yWyyyXSmTXdqfDG77PfBCc6+IIZBp5C7OzX/iqXAlDqoUCn1y7hopQKxZZLJV4NR4zThL+Go+5dfUqYT7P7tERZ27kahBwKQyR9cuXreh57Ny8Oel+f3eXj9fXAdjpdpkNAt6an5/kv3z0iM+bzcn6114PaTYaFqlSVOWiKm/PzbE5tenHbpfBaMTt1VW+63S4Uaud2wL4YHubf9KU2Ayd+MeM5VKJTfd1+qMRAE8HA/b7fX56+ZJvnz9n5/CQahDw8OCAkzTlzIzEDE3cw9rcHHdaLf6MYx7s7/O03wdgmKb8Phxyb2+P10nC9y9e8PDggAfPnnFixokZCaApcGrG5vXr/BHH3N3b45dej/bxMQA/93q8SlNepymd4ZCtdpvYjJEZp8BJmiJr9boVnBHfqVTY7/cnrn6/VuOHw8Nz+sCZ2XkAp2lK4kgkgCzV65Z5JjvyHiAimBkpkLr/z5kTOdMle5+Y8S/SLhfJwBaVYAAAAABJRU5ErkJggg==") !important; }
      .faction-war [data-emu-caller-sort-active="true"] { display: flex !important; flex-direction: column !important; }
      .faction-war .emu-caller-feed-status { position: relative !important; overflow: hidden !important; }
      .faction-war .emu-caller-status-chip { display: flex !important; position: absolute !important; z-index: 4; inset: 0; align-items: center; justify-content: center; box-sizing: border-box; overflow: hidden; padding: 0 1px; color: #aaa; font: 800 8px/12px Arial,sans-serif; text-align: center; text-overflow: ellipsis; text-transform: none; white-space: nowrap; }
      .faction-war .emu-caller-status-chip[data-kind="okay"] { color: #84c526; }
      .faction-war .emu-caller-status-chip[data-kind="hospital"],
      .faction-war .emu-caller-status-chip[data-kind="jail"] { color: #ef6c71; }
      .faction-war .emu-caller-status-chip[data-kind="hospital-abroad"] { color: #f3a33c; }
      .faction-war .emu-caller-status-chip[data-kind="travel"] { color: #33c4dc; }
      .faction-war .emu-caller-native-cd {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch;
        justify-content: center;
        gap: 0;
        width: 70px !important;
        flex-basis: 70px !important;
        padding: 0 2px !important;
        white-space: nowrap;
      }
      .faction-war .emu-caller-native-cd > span { display: flex; align-items: center; gap: 2px; width: 100%; min-width: 0; height: 8px; color: #777; font: 8px/8px Arial,sans-serif; }
      .faction-war .emu-caller-native-cd > span.has-value { color: #a8c96a; }
      .faction-war .emu-caller-native-cd > span.ready { color: #72bd35; }
      .faction-war .emu-caller-native-cd i { display: inline-flex; align-items: center; justify-content: center; width: 11px; height: 8px; flex: 0 0 11px; color: inherit; font-style: normal; font-weight: 900; }
      .faction-war .emu-caller-native-cd i svg { width: 9px; height: 9px; fill: #588e22; }
      .faction-war .emu-caller-native-cd .kind-booster i svg { fill: #d7a93a; }
      .faction-war .emu-caller-native-cd i img { display: block; width: 9px; height: 9px; object-fit: contain; }
      .faction-war .emu-caller-native-cd b { display: block; max-width: 52px; overflow: hidden; font: 700 7px/8px monospace; text-overflow: ellipsis; }
      .faction-war [data-emu-caller-native-row="true"] .emu-caller-attack-cell { display: flex !important; align-items: center !important; justify-content: flex-start; white-space: nowrap !important; }
      .faction-war [data-emu-caller-native-row="true"] .emu-caller-row-tools { display: inline-flex !important; float: none !important; gap: 3px !important; width: 79px !important; height: 24px !important; flex: 0 0 79px !important; margin: 0 3px 0 0 !important; padding: 0 !important; }
      .faction-war [data-emu-caller-native-row="true"] .emu-caller-call-button { width: 52px !important; min-width: 52px !important; height: 24px !important; min-height: 24px !important; margin: 0 !important; padding: 0 2px !important; font-size: 9px !important; line-height: 22px !important; }
      .faction-war [data-emu-caller-native-row="true"] .emu-caller-pin-button { width: 24px !important; min-width: 24px !important; height: 24px !important; }
      .faction-war .emu-caller-native-attack-link { display: inline-flex !important; float: none !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important; width: 32px !important; min-width: 32px !important; height: 24px !important; margin: 0 !important; padding: 0 !important; border: 1px solid #ff6475 !important; border-radius: 3px !important; background: linear-gradient(#a51f32,#741020) !important; font-size: 0 !important; text-align: center !important; text-decoration: none !important; }
      .faction-war .emu-caller-native-attack-link::after { content: "ATK"; color: #fff; font-size: 8px; font-weight: 900; }
      .faction-war .emu-caller-native-sort { cursor: pointer; user-select: none; }
      .faction-war .emu-caller-native-sort-indicator { margin-left: 2px; color: #68b8e8; font-style: normal; }
      .faction-war .emu-caller-clock-sort {
        position: absolute !important;
        top: 50% !important;
        left: -10px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        width: 20px !important;
        min-width: 20px !important;
        height: 22px !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: translateY(-50%) !important;
        border: 1px solid #777;
        border-radius: 3px;
        background: #292929;
        color: #ddd;
        font: 900 13px/20px Arial,sans-serif;
        vertical-align: middle;
        cursor: pointer;
      }
      .faction-war .emu-caller-clock-sort:hover, .faction-war .emu-caller-clock-sort.active { border-color: #84c526; background: #273517; color: #a9e85b; }
      .faction-war [data-emu-caller-native-row="true"] .emu-war-bsp-badge { display: none !important; }
      @media (max-width: 500px) {
        .faction-war [data-emu-caller-native-header="true"], .faction-war [data-emu-caller-native-row="true"] { font-size: 10px !important; }
        .faction-war [data-emu-caller-native-header="true"] > :first-child,
        .faction-war [data-emu-caller-native-row="true"] > :first-child,
        .faction-war [data-emu-caller-native-row="true"] > .member,
        .faction-war [data-emu-caller-native-row="true"] > [class*="member___"],
        .faction-war [data-emu-caller-native-row="true"] > [class*="user___"] { min-width: 72px !important; max-width: none !important; }
        .faction-war .emu-caller-bsp-header, .faction-war .emu-caller-bsp-cell { width: 42px !important; flex-basis: 42px !important; padding: 0 1px !important; }
        .faction-war [data-emu-caller-native-header="true"] > .points, .faction-war [data-emu-caller-native-header="true"] > .score, .faction-war [data-emu-caller-native-header="true"] > [class*="points___"], .faction-war [data-emu-caller-native-header="true"] > [class*="score___"], .faction-war [data-emu-caller-native-row="true"] > .points, .faction-war [data-emu-caller-native-row="true"] > .score, .faction-war [data-emu-caller-native-row="true"] > [class*="points___"], .faction-war [data-emu-caller-native-row="true"] > [class*="score___"] { width: 52px !important; flex-basis: 52px !important; }
        .faction-war [data-emu-caller-native-header="true"] > .status, .faction-war [data-emu-caller-native-header="true"] > [class*="status___"], .faction-war [data-emu-caller-native-row="true"] > .status, .faction-war [data-emu-caller-native-row="true"] > [class*="status___"] { width: 54px !important; flex-basis: 54px !important; }
        .faction-war [data-emu-caller-native-header="true"] > .attack, .faction-war [data-emu-caller-native-header="true"] > [class*="attack___"], .faction-war [data-emu-caller-native-row="true"] > .attack, .faction-war [data-emu-caller-native-row="true"] > [class*="attack___"] { width: 104px !important; flex-basis: 104px !important; }
        .faction-war .emu-caller-native-cd { width: 60px !important; flex-basis: 60px !important; }
        .faction-war .emu-caller-native-cd b { display: block; max-width: 43px; font-size: 7px; }
        .faction-war .emu-caller-native-last-header, .faction-war .emu-caller-native-last { display: none !important; }
        .faction-war [data-emu-caller-native-row="true"] .emu-caller-row-tools { width: 70px !important; flex-basis: 70px !important; margin-right: 2px !important; }
        .faction-war [data-emu-caller-native-row="true"] .emu-caller-call-button { width: 43px !important; min-width: 43px !important; font-size: 8px !important; }
      }
      .faction-war .emu-caller-pin-host { position: relative !important; overflow: hidden !important; }
      .faction-war .emu-caller-name-pin {
        position: absolute !important; z-index: 9 !important; top: 50% !important; right: auto !important; left: 1px !important;
        width: 14px !important; min-width: 14px !important; height: 14px !important; min-height: 14px !important;
        margin: 0 !important; padding: 0 !important; border-color: rgba(160,160,160,.65) !important;
        border-radius: 50% !important; background: rgba(25,25,25,.82) !important; color: #d5d5d5 !important;
        transform: translateY(-50%) !important; font-size: 10px !important; line-height: 12px !important; touch-action: manipulation;
      }
      .faction-war .emu-caller-name-pin[data-emu-caller-pin-anchor="member"] { left: 44px !important; }
      .faction-war .emu-caller-name-pin.active { border-color: #ffd45c !important; background: rgba(89,67,12,.94) !important; color: #ffe486 !important; }
      .faction-war [data-emu-caller-native-header="true"] > .attack,
      .faction-war [data-emu-caller-native-header="true"] > [class*="attack___"],
      .faction-war [data-emu-caller-native-row="true"] > .attack,
      .faction-war [data-emu-caller-native-row="true"] > [class*="attack___"] { width: 88px !important; flex-basis: 88px !important; }
      .faction-war [data-emu-caller-native-row="true"] .emu-caller-row-tools { gap: 0 !important; width: 52px !important; flex: 0 0 52px !important; }
      @media (max-width: 500px) {
        .faction-war [data-emu-caller-native-header="true"] > .attack,
        .faction-war [data-emu-caller-native-header="true"] > [class*="attack___"],
        .faction-war [data-emu-caller-native-row="true"] > .attack,
        .faction-war [data-emu-caller-native-row="true"] > [class*="attack___"] { width: 84px !important; flex-basis: 84px !important; }
        .faction-war [data-emu-caller-native-row="true"] .emu-caller-row-tools { width: 48px !important; flex-basis: 48px !important; }
        .faction-war [data-emu-caller-native-row="true"] .emu-caller-call-button { width: 48px !important; min-width: 48px !important; }
        .faction-war .emu-caller-name-pin { width: 13px !important; min-width: 13px !important; height: 13px !important; min-height: 13px !important; font-size: 9px !important; line-height: 11px !important; }
      }
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > .member,
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > [class*="member___"],
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > [class*="user___"] {
        min-width: 88px !important;
        overflow: hidden !important;
      }
      html.emu-caller-android .faction-war .emu-caller-bsp-header,
      html.emu-caller-android .faction-war .emu-caller-bsp-cell { width: 38px !important; flex-basis: 38px !important; }
      html.emu-caller-android .faction-war .emu-caller-bsp-cell { margin: 0 !important; padding: 0 !important; }
      html.emu-caller-android .faction-war [data-emu-caller-native-header="true"] > .points,
      html.emu-caller-android .faction-war [data-emu-caller-native-header="true"] > .score,
      html.emu-caller-android .faction-war [data-emu-caller-native-header="true"] > [class*="points___"],
      html.emu-caller-android .faction-war [data-emu-caller-native-header="true"] > [class*="score___"],
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > .points,
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > .score,
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > [class*="points___"],
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > [class*="score___"] { width: 44px !important; flex-basis: 44px !important; }
      html.emu-caller-android .faction-war [data-emu-caller-native-header="true"] > .status,
      html.emu-caller-android .faction-war [data-emu-caller-native-header="true"] > [class*="status___"],
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > .status,
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > [class*="status___"] { width: 54px !important; flex-basis: 54px !important; }
      html.emu-caller-android .faction-war [data-emu-caller-native-header="true"] > .attack,
      html.emu-caller-android .faction-war [data-emu-caller-native-header="true"] > [class*="attack___"],
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > .attack,
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] > [class*="attack___"] { width: 64px !important; flex-basis: 64px !important; }
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] .emu-caller-row-tools {
        width: 32px !important;
        flex-basis: 32px !important;
      }
      html.emu-caller-android .faction-war [data-emu-caller-native-row="true"] .emu-caller-call-button {
        width: 32px !important;
        min-width: 32px !important;
        font-size: 7px !important;
      }
      html.emu-caller-android .faction-war .emu-caller-native-attack-link {
        width: 30px !important;
        min-width: 30px !important;
      }
      html.emu-caller-android .faction-war .emu-caller-name-pin {
        width: 11px !important;
        min-width: 11px !important;
        height: 11px !important;
        min-height: 11px !important;
        font-size: 8px !important;
        line-height: 9px !important;
      }
      .faction-war .emu-caller-compact-member {
        position: relative !important;
        display: grid !important;
        grid-template-columns: minmax(0,1fr) !important;
        grid-template-rows: 20px 11px !important;
        align-content: center !important;
        box-sizing: border-box !important;
        min-height: 35px !important;
        overflow: hidden !important;
        padding: 1px 18px 1px 6px !important;
        background: none !important;
        background-image: none !important;
      }
      .faction-war .emu-caller-compact-member > :not(.emu-caller-readable-name):not(.emu-caller-native-level):not(.emu-caller-name-pin) {
        display: none !important;
      }
      .faction-war .emu-caller-compact-member .emu-caller-readable-name {
        position: static !important;
        z-index: 2 !important;
        display: block !important;
        grid-row: 1 !important;
        min-width: 0 !important;
        overflow: hidden !important;
        padding: 0 !important;
        background: none !important;
        background-image: none !important;
        color: #ddd !important;
        font: 800 11px/20px Arial,sans-serif !important;
        text-align: left !important;
        text-decoration: none !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .faction-war .emu-caller-compact-member .emu-caller-readable-name::before {
        content: "";
        display: inline-block;
        width: 7px;
        min-width: 7px;
        height: 7px;
        margin: 0 4px 1px 0;
        border-radius: 50%;
        background: #e5525d;
        box-shadow: 0 0 3px rgba(229,82,93,.55);
        vertical-align: middle;
      }
      .faction-war .emu-caller-compact-member .emu-caller-readable-name[data-emu-caller-activity="online"]::before { background: #77d43b; box-shadow: 0 0 4px rgba(119,212,59,.7); }
      .faction-war .emu-caller-compact-member .emu-caller-readable-name[data-emu-caller-activity="idle"]::before { background: #f1a62f; box-shadow: 0 0 4px rgba(241,166,47,.65); }
      .faction-war .emu-caller-compact-member .emu-caller-readable-name[data-emu-caller-activity="offline"]::before { background: #e5525d; box-shadow: 0 0 3px rgba(229,82,93,.55); }
      .faction-war [data-emu-caller-bsp-tier="red"] .emu-caller-readable-name { color: #f2483d !important; }
      .faction-war [data-emu-caller-bsp-tier="orange"] .emu-caller-readable-name { color: #f3b04d !important; }
      .faction-war [data-emu-caller-bsp-tier="blue"] .emu-caller-readable-name { color: #5ca9ff !important; }
      .faction-war [data-emu-caller-bsp-tier="green"] .emu-caller-readable-name { color: #98e875 !important; }
      .faction-war [data-emu-caller-bsp-tier="white"] .emu-caller-readable-name { color: #f5f5f5 !important; }
      .faction-war [data-emu-caller-bsp-tier="grey"] .emu-caller-readable-name { color: #b8b8b8 !important; }
      .faction-war .emu-caller-compact-member .emu-caller-native-level {
        position: static !important;
        z-index: 2 !important;
        display: block !important;
        grid-row: 2 !important;
        width: auto !important;
        height: 11px !important;
        overflow: hidden !important;
        color: #aaa !important;
        font: 8px/11px Arial,sans-serif !important;
        text-align: left !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .faction-war .emu-caller-compact-member .emu-caller-name-pin,
      html.emu-caller-android .faction-war .emu-caller-compact-member .emu-caller-name-pin {
        top: 50% !important;
        right: 2px !important;
        left: auto !important;
      }
      .faction-war .emu-caller-compact-member img:not(.emu-caller-native-revive) {
        display: none !important;
      }
      .faction-war [data-emu-caller-native-row="true"],
      .faction-war [data-emu-caller-native-row="true"] > .emu-caller-compact-member {
        background-image: none !important;
      }
    `;
        const style = existing || document.createElement("style");
        style.id = "emu-control-companion-styles";
        style.dataset.emuCallerStyleVersion = RUNTIME_VERSION;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    function showToast(message) {
        const toast = document.createElement("div");
        toast.textContent = message;
        toast.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:999999;border:1px solid #6fe58c;background:#07100a;color:#dfffe6;padding:8px 10px;font:12px monospace";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 6000);
    }

    function getApiKey() {
        return String(getValue(STORAGE.apiKey, "") || "").trim();
    }

    function isLikelyApiKey(value) {
        return /^[A-Za-z0-9]{16,64}$/.test(String(value || "").trim());
    }

    function getValue(key, fallback) {
        try {
            return GM_getValue(key, fallback);
        } catch (err) {
            return localStorage.getItem(key) || fallback;
        }
    }

    function setValue(key, value) {
        try {
            GM_setValue(key, value);
        } catch (err) {
            localStorage.setItem(key, String(value));
        }
    }

    function getBool(key, fallback) {
        const value = getValue(key, fallback ? "1" : "0");
        return value === true || value === "1" || value === "true";
    }

    function setBool(key, value) {
        setValue(key, value ? "1" : "0");
    }

    function setText(id, text) {
        const node = document.getElementById(id);
        if (node && node.textContent !== String(text)) node.textContent = String(text);
    }

    function cleanName(text) {
        return String(text || "").replace(/\s*\[\d+\].*$/, "").replace(/\s+/g, " ").trim().slice(0, 80);
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, "&#096;");
    }

    function friendlyError(err) {
        return String(err?.message || err || "unknown").replace(/^Error:\s*/, "");
    }

    function timeAgo(epochSeconds) {
        const seconds = Math.max(0, Math.floor(Date.now() / 1000) - Number(epochSeconds || 0));
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    }
    function removeStandaloneChainPanel() {
        if (!/\/factions\.php|\/war\.php|\/loader\.php|\/page\.php/i.test(location.pathname)) return;
        document.querySelectorAll("#emu-caller-chain-watch, .emu-caller-chain-panel, [data-emu-chain-panel]").forEach(node => node.remove());
    }

    function bootStandaloneChainCleanup() {
        removeStandaloneChainPanel();
        window.setTimeout(removeStandaloneChainPanel, 250);
        window.setTimeout(removeStandaloneChainPanel, 1200);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootStandaloneChainCleanup, { once: true });
    } else if (document.body) {
        bootStandaloneChainCleanup();
    }
})();
