export const CSS = `
.tk{--input:#F4F6F8;--input-line:#7D8994;--placeholder:#56626D;--ink:#14181A;--surf:#E9EDEA;--card:#FFF;--card-glass:rgba(255,255,255,.93);--card-dense:rgba(255,255,255,.96);--card-mobile:rgba(255,255,255,.96);--steel:#55615D;--line:#D3D9D5;--deep:#2E2A72;--link:#2E2A72;--dl:#2FA090;--hot:#B4402F;
 --bar:#14181A;--bar-glass:rgba(20,24,26,.72);--bar-mobile:rgba(20,24,26,.94);--bar-text:#EDF0EE;--bar-muted:#A4B1AC;--glass-line:rgba(255,255,255,.12);--alert:#FBEFEC;--alert-line:#E6C3B9;
 --fitness-bg:url('fitness-background-light.webp');--center-bg:url('fitness-center-light-v1.jpg');--center-tint:rgba(233,237,234,.28);--center-opacity:.48;--center-mobile-opacity:.26;--card-shadow:0 8px 28px rgba(28,36,32,.08);
 font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background-color:var(--surf);background-image:var(--fitness-bg);
 background-repeat:no-repeat;background-position:center top;background-size:cover;background-attachment:fixed;
 color:var(--ink);min-height:100vh;line-height:1.5;color-scheme:light;position:relative;isolation:isolate;}
.tk[data-theme="dark"]{--input:#293330;--input-line:#798B84;--placeholder:#B8C5BF;--ink:#F7FAF8;--surf:#101613;--card:#1B2320;--card-glass:#1B2320;--card-dense:#1B2320;--card-mobile:#1B2320;--steel:#C0CEC7;--line:#45544D;--deep:#6654D6;--link:#C4BBFF;--dl:#4FC4B0;--hot:#E87360;
 --bar:#070908;--bar-glass:rgba(7,9,8,.70);--bar-mobile:rgba(7,9,8,.94);--bar-text:#F1F5F3;--bar-muted:#A7B5B0;--glass-line:rgba(255,255,255,.10);--alert:#2B1815;--alert-line:#704036;
 --fitness-bg:url('fitness-background-dark.webp');--center-bg:url('fitness-center-dark-v1.jpg');--center-tint:rgba(6,9,8,.34);--center-opacity:.62;--center-mobile-opacity:.34;--card-shadow:0 10px 32px rgba(0,0,0,.20);color-scheme:dark;}
.tk *{box-sizing:border-box;}
.tk::before{content:"";position:fixed;z-index:0;pointer-events:none;top:0;bottom:0;left:50%;width:min(1040px,100vw);transform:translateX(-50%);background-image:linear-gradient(var(--center-tint),var(--center-tint)),var(--center-bg);background-repeat:no-repeat;background-position:center top;background-size:cover;opacity:var(--center-opacity);filter:saturate(.82) contrast(.94);mask-image:linear-gradient(90deg,transparent 0,#000 11%,#000 89%,transparent 100%);-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 11%,#000 89%,transparent 100%);}
.tk-bar,.tk-main{position:relative;z-index:1;}
.tk-bar{background:var(--bar-glass);color:var(--bar-text);padding:18px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-bottom:1px solid var(--glass-line);box-shadow:0 6px 24px rgba(0,0,0,.14);backdrop-filter:blur(8px) saturate(.84);-webkit-backdrop-filter:blur(8px) saturate(.84);}
.tk-mark{font-family:'Arial Black','Segoe UI',system-ui,sans-serif;font-weight:700;font-size:17px;letter-spacing:-.02em;}
.tk-sub{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;color:var(--bar-muted);text-transform:uppercase;letter-spacing:.1em;}
.tk-theme{font:inherit;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;color:var(--bar-text);background:transparent;border:1px solid var(--bar-muted);border-radius:2px;padding:7px 10px;cursor:pointer;margin-left:auto;}
.tk-theme:hover{border-color:var(--bar-text);}
.tk-theme:focus-visible{outline:2px solid var(--bar-text);outline-offset:2px;}
.tk-credit{position:fixed;right:16px;bottom:14px;z-index:20;display:flex;align-items:baseline;gap:6px;padding:7px 11px;
 background:var(--card);color:var(--steel);border:1px solid var(--line);border-radius:999px;box-shadow:0 5px 18px rgba(0,0,0,.14);
 pointer-events:none;white-space:nowrap;}
.tk-credit span{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.12em;}
.tk-credit strong{font-family:Georgia,'Times New Roman',serif;font-size:13px;font-style:italic;font-weight:600;letter-spacing:.01em;color:var(--ink);}
.tk-main{max-width:1040px;margin:0 auto;padding:24px 20px 80px;}
.tk-card{background:var(--card-glass);border:1px solid var(--line);border-radius:16px;padding:24px;margin-bottom:18px;box-shadow:var(--card-shadow);backdrop-filter:blur(7px) saturate(.92);-webkit-backdrop-filter:blur(7px) saturate(.92);}
.tk-card-dense{background:var(--card-dense);}
.tk-eyebrow{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--steel);margin-bottom:10px;}
.tk-h{font-family:'Arial Black','Segoe UI',system-ui,sans-serif;font-weight:700;font-size:24px;letter-spacing:-.02em;margin:0 0 6px;}
.tk-p{font-size:14px;color:var(--steel);margin:0 0 14px;}
.tk-field{margin-bottom:20px;}
.tk-lbl{display:block;font-size:14px;font-weight:600;margin-bottom:8px;}
.tk-hint{font-size:13px;color:var(--steel);margin-top:6px;}
.tk-help{margin:0 0 8px;}
.tk-help summary{display:flex;align-items:center;gap:7px;width:fit-content;list-style:none;cursor:pointer;color:var(--ink);}
.tk-help summary::-webkit-details-marker{display:none;}
.tk-help summary:focus-visible{outline:2px solid var(--link);outline-offset:3px;border-radius:2px;}
.tk-help-label{font-size:14px;font-weight:600;}
.tk-help-note{font-size:12px;font-weight:400;color:var(--steel);}
.tk-help-icon{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--line);border-radius:50%;font-family:Georgia,serif;font-size:12px;font-weight:700;color:var(--link);background:var(--card);}
.tk-help summary:hover .tk-help-icon,.tk-help[open] .tk-help-icon{border-color:var(--deep);background:var(--deep);color:#fff;}
.tk-help-body{max-width:680px;margin-top:7px;padding:9px 11px;border-left:2px solid var(--link);background:var(--surf);font-size:12px;font-weight:400;color:var(--steel);line-height:1.5;}
.tk-reading{border:1px solid var(--line);border-radius:4px;background:var(--card-glass);margin-bottom:14px;box-shadow:var(--card-shadow);overflow:hidden;}
.tk-reading summary{display:flex;align-items:center;gap:12px;padding:15px 18px;cursor:pointer;list-style:none;}
.tk-reading summary::-webkit-details-marker{display:none;}
.tk-reading summary:focus-visible{outline:2px solid var(--link);outline-offset:-3px;}
.tk-reading-heading{display:flex;flex-direction:column;gap:2px;min-width:0;}
.tk-reading-heading strong{font-size:14px;}
.tk-reading-heading small{font-size:11px;font-weight:400;color:var(--steel);}
.tk-reading-arrow{margin-left:auto;color:var(--steel);transition:transform .15s ease;}
.tk-reading[open] .tk-reading-arrow{transform:rotate(180deg);}
.tk-reading-body{padding:14px 18px 17px;border-top:1px solid var(--line);}
.tk-reading-intro{font-size:12px;color:var(--steel);margin:0 0 11px;}
.tk-reading-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.tk-reading-item{padding:10px 11px;background:var(--surf);border-radius:3px;}
.tk-reading-item b{display:block;font-size:12px;margin-bottom:2px;}
.tk-reading-item span{display:block;font-size:11px;color:var(--steel);line-height:1.45;}
.tk-opts{display:flex;flex-wrap:wrap;gap:6px;}
.tk-opt{font:inherit;font-size:13px;padding:8px 13px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:2px;cursor:pointer;}
.tk-opt:hover{border-color:var(--link);}
.tk-opt[aria-pressed="true"]{background:var(--deep);border-color:var(--deep);color:#fff;}
.tk-exclude{border:1px solid var(--line);border-radius:3px;background:var(--card);overflow:hidden;}
.tk-exclude summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 14px;cursor:pointer;list-style:none;}
.tk-exclude summary::-webkit-details-marker{display:none;}
.tk-exclude summary:focus-visible{outline:2px solid var(--link);outline-offset:-2px;}
.tk-exclude-heading{display:flex;flex-direction:column;gap:2px;min-width:0;}
.tk-exclude-heading strong{font-size:13px;}
.tk-exclude-heading small{font-size:11px;font-weight:400;color:var(--steel);}
.tk-exclude-state{display:flex;align-items:center;gap:8px;flex-shrink:0;font-size:11px;color:var(--steel);white-space:nowrap;}
.tk-exclude-state::after{content:"⌄";font-size:15px;line-height:1;transition:transform .15s ease;}
.tk-exclude[open] .tk-exclude-state::after{transform:rotate(180deg);}
.tk-exclude-body{padding:12px 14px 14px;border-top:1px solid var(--line);}
.tk-exclude-intro{font-size:12px;color:var(--steel);margin:0 0 10px;}
.tk-exclude-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;}
.tk-exclude-item{font:inherit;display:flex;align-items:flex-start;gap:10px;padding:11px 12px;text-align:left;border:1px solid var(--line);border-radius:3px;background:var(--card);color:var(--ink);cursor:pointer;}
.tk-exclude-item:hover{border-color:var(--link);}
.tk-exclude-item[aria-pressed="true"]{border-color:var(--deep);background:var(--surf);}
.tk-exclude-box{display:grid;place-items:center;width:18px;height:18px;flex:0 0 18px;margin-top:1px;border:1px solid var(--line);border-radius:2px;font-size:12px;color:#fff;}
.tk-exclude-item[aria-pressed="true"] .tk-exclude-box{border-color:var(--deep);background:var(--deep);}
.tk-exclude-copy{display:flex;flex-direction:column;gap:2px;}
.tk-exclude-copy b{font-size:12px;font-weight:600;}
.tk-exclude-copy small{font-size:11px;color:var(--steel);line-height:1.35;}
.tk-exclude-warning{font-size:11px;color:var(--hot);margin:10px 0 0;}
.tk-home{margin-top:12px;border:1px solid var(--line);border-radius:3px;background:var(--card);padding:14px;}
.tk-home-title{display:block;font-size:13px;margin-bottom:3px;}
.tk-home-intro{font-size:12px;color:var(--steel);margin:0 0 11px;}
.tk-home-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
.tk-home-item{font:inherit;display:flex;align-items:flex-start;gap:9px;padding:11px;text-align:left;border:1px solid var(--line);border-radius:3px;background:var(--card);color:var(--ink);cursor:pointer;}
.tk-home-item:hover{border-color:var(--link);}
.tk-home-item[aria-pressed="true"]{border-color:var(--deep);background:var(--surf);}
.tk-home-check{display:grid;place-items:center;width:18px;height:18px;flex:0 0 18px;margin-top:1px;border:1px solid var(--line);border-radius:2px;font-size:12px;color:#fff;}
.tk-home-item[aria-pressed="true"] .tk-home-check{border-color:var(--deep);background:var(--deep);}
.tk-home-copy{display:flex;flex-direction:column;gap:2px;}
.tk-home-copy b{font-size:12px;}
.tk-home-copy small{font-size:11px;color:var(--steel);line-height:1.35;}
.tk-home-bodyweight{font-size:12px;margin:10px 0 0;color:var(--steel);}
.tk-home-bodyweight b{color:var(--ink);}
.tk-home-kit{margin-top:13px;padding-top:13px;border-top:1px solid var(--line);}
.tk-home-kit h4{font-size:13px;margin:0 0 8px;}
.tk-home-kit-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.tk-home-kit h5{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--steel);margin:0 0 5px;}
.tk-home-kit ul{font-size:12px;margin:0;padding-left:18px;}
.tk-home-kit li{margin-bottom:4px;}
.tk-home-safe{font-size:11px;color:var(--hot);margin:10px 0 0;}
.tk-opt:focus-visible,.tk-wk:focus-visible,.tk-day:focus-visible,.tk-mini:focus-visible{outline:2px solid var(--link);outline-offset:2px;}
.tk-num{font:inherit;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;width:88px;padding:9px 11px;border:1px solid var(--line);border-radius:2px;background:var(--card);color:var(--ink);}
.tk-cta{font:inherit;font-family:'Arial Black','Segoe UI',system-ui,sans-serif;font-weight:500;font-size:15px;width:100%;padding:15px;background:var(--deep);color:#fff;border:none;border-radius:3px;cursor:pointer;}
.tk-cta[disabled]{background:#A9B3AF;cursor:not-allowed;}
.tk-check{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--steel);margin-bottom:14px;}
.tk-check input{margin-top:3px;flex-shrink:0;}
.tk-ramp{display:flex;align-items:flex-end;gap:3px;height:112px;margin-bottom:2px;}
.tk-wk{flex:1;display:flex;flex-direction:column;justify-content:flex-end;background:none;border:none;padding:0;cursor:pointer;height:100%;min-width:0;}
.tk-wk span{display:block;border-radius:2px 2px 0 0;transition:height .18s ease;}
.tk-wk b{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:10px;font-weight:500;color:var(--steel);padding-top:7px;border-top:1px solid var(--line);overflow:hidden;}
.tk-wk[aria-pressed="true"] b{color:var(--ink);border-top:2px solid var(--ink);padding-top:6px;}
.tk-wkmeta{display:flex;gap:18px;flex-wrap:wrap;align-items:baseline;margin:16px 0 8px;}
.tk-rir{font-family:'Arial Black','Segoe UI',system-ui,sans-serif;font-weight:700;font-size:22px;letter-spacing:-.03em;}
.tk-rir small{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;font-weight:400;color:var(--steel);display:block;letter-spacing:0;}
.tk-days{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
.tk-day{font:inherit;font-size:13px;padding:8px 13px;border:1px solid var(--line);background:var(--card);border-radius:2px;cursor:pointer;color:var(--ink);}
.tk-day[aria-pressed="true"]{background:var(--deep);border-color:var(--deep);color:#fff;}
.tk-warm{background:var(--surf);border-radius:3px;padding:12px 14px;margin-bottom:16px;font-size:13px;}
.tk-warm ul{margin:6px 0 0;padding-left:18px;}
.tk-warm li{margin-bottom:6px;}
.tk-warm-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.tk-warm-toggle{font:inherit;font-size:11px;color:var(--link);background:none;border:0;padding:2px 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px;}
.tk-warm-toggle:focus-visible{outline:2px solid var(--link);outline-offset:2px;}
.tk-warm-guide{margin:8px 0 12px;max-width:680px;}
.tk-warm-guide .tk-media{margin-bottom:8px;}
.tk-warm-notes{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.tk-warm-note{background:var(--card);border-left:2px solid var(--dl);padding:8px 10px;color:var(--steel);font-size:12px;}
.tk-warm-note.bad{border-left-color:var(--hot);}
.tk-warm-note b{display:block;color:var(--ink);font-size:10px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px;}
.tk-ex{border:1px solid var(--line);border-radius:14px;padding:20px;margin-top:18px;display:flex;gap:12px;background:var(--card);box-shadow:0 4px 16px rgba(0,0,0,.06);}
.tk-idx{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:12px;color:var(--steel);padding-top:2px;min-width:22px;}
.tk-exbody{flex:1;min-width:0;}
.tk-exname{font-weight:700;font-size:19px;line-height:1.4;margin-bottom:14px;}
.tk-badge{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:10px;letter-spacing:.06em;padding:2px 6px;border-radius:2px;margin-left:6px;white-space:nowrap;}
.tk-b-heavy{background:var(--hot);color:#fff;}
.tk-b-prio{background:var(--deep);color:#fff;}
.tk-b-tech{background:var(--surf);color:var(--steel);border:1px solid var(--line);}

.tk-tags{font-size:13px;color:var(--steel);margin-top:4px;}
.tk-mini{font:inherit;font-size:12px;background:none;border:none;color:var(--link);cursor:pointer;padding:6px 8px 0 0;text-decoration:underline;text-underline-offset:3px;}
.tk-tech{background:var(--surf);border-left:2px solid var(--link);padding:11px 13px;margin-top:10px;font-size:13px;}
.tk-tech p{margin:0 0 7px;}
.tk-tech p:last-child{margin:0;}
.tk-tech strong{font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--steel);display:block;margin-bottom:2px;}
.tk-media{margin:0 0 11px;background:#111318;border:1px solid var(--line);border-radius:3px;overflow:hidden;}
.tk-media img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:contain;background:#111318;}
.tk-media figcaption{padding:7px 10px;color:#BCC5C1;background:#111318;font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;}
.tk-media-pending{color:var(--steel);font-size:12px;}
.tk-swap{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;}
.tk-vol{display:flex;flex-direction:column;gap:11px;}
.tk-volrow{display:grid;grid-template-columns:110px 1fr 60px;gap:10px;align-items:center;font-size:13px;}
.tk-track{height:7px;background:var(--surf);border-radius:4px;overflow:hidden;}
.tk-fill{height:100%;background:var(--deep);}
.tk-fill.low{background:#A9B3AF;}
.tk-fill.over{background:var(--hot);}
.tk-volnum{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:12px;color:var(--steel);text-align:right;}
.tk-split{grid-column:1/-1;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;color:var(--steel);margin-top:-6px;}
.tk-foot{font-size:12px;color:var(--steel);border-top:1px solid var(--line);padding-top:14px;}
.tk-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.tk-chip{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;padding:4px 9px;background:var(--surf);border:1px solid var(--line);border-radius:2px;color:var(--steel);}
.tk-rule{border-top:1px solid var(--line);padding:12px 0 0;margin-top:12px;font-size:13px;}
.tk-load{display:flex;align-items:end;gap:10px;margin:14px 0;flex-wrap:wrap;}
.tk-load b{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:14px;background:var(--deep);color:#fff;padding:2px 8px;border-radius:2px;}
.tk-wnum{font:inherit;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;width:104px;padding:5px 8px;border:1px solid var(--line);border-radius:2px;background:var(--card);color:var(--ink);font-size:12px;}
.tk-actions{display:flex;gap:4px 10px;flex-wrap:wrap;align-items:center;}
.tk-file{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;}
.tk-journal-progress{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surf);border:1px solid var(--line);border-radius:3px;padding:9px 11px;margin:0 0 6px;font-size:12px;color:var(--steel);}
.tk-journal-progress b{color:var(--ink);}
.tk-log{display:flex;align-items:end;gap:14px;flex-wrap:wrap;background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:14px;}
.tk-logdone{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;min-height:44px;cursor:pointer;}
.tk-logfield{display:flex;flex-direction:column;gap:6px;font-family:inherit;font-size:12px;font-weight:600;color:var(--steel);min-width:0;}
.tk-logfield input{font:inherit;font-size:17px;font-weight:650;font-variant-numeric:tabular-nums;width:100px;min-width:0;min-height:46px;padding:9px 10px;border:1px solid var(--input-line);border-radius:8px;background:var(--input);color:var(--ink);}
.tk-health-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:12px;}
.tk-health-item{border:1px solid var(--line);border-radius:3px;background:var(--surf);padding:11px 12px;}
.tk-health-item b{display:block;font-size:12px;margin-bottom:3px;}
.tk-health-item span{display:block;font-size:11px;color:var(--steel);line-height:1.45;}
.tk-health-log{margin-bottom:12px;}
.tk-progress-list{display:grid;gap:8px;}
.tk-progress-list>div{display:grid;grid-template-columns:minmax(220px,1fr) minmax(160px,2fr);gap:12px;align-items:center;font-size:12px;color:var(--steel);}
.tk-progress-list span{color:var(--ink);}
.tk-progress-list progress{width:100%;height:9px;accent-color:var(--deep);}
.tk-progress-list progress::-webkit-progress-bar{background:var(--surf);border-radius:9px;}
.tk-progress-list progress::-webkit-progress-value{background:var(--deep);border-radius:9px;}
.tk-progress-list progress::-moz-progress-bar{background:var(--deep);border-radius:9px;}
.tk-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 16px;}
.tk-stat-grid>div{padding:10px;background:var(--surf);border:1px solid var(--line);border-radius:3px;}
.tk-stat-grid b{display:block;font-size:20px;line-height:1.1;}
.tk-stat-grid span{display:block;font-size:10px;color:var(--steel);margin-top:4px;}
.tk-trend{height:150px;display:flex;align-items:flex-end;gap:5px;padding:20px 4px 22px;border-bottom:1px solid var(--line);overflow-x:auto;}
.tk-trend-col{height:100%;min-width:42px;flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative;}
.tk-trend-col i{display:block;width:min(28px,75%);min-height:4px;background:var(--deep);border-radius:2px 2px 0 0;}
.tk-trend-value{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:8px;color:var(--steel);margin-bottom:3px;}
.tk-trend-col small{position:absolute;top:calc(100% + 4px);font-size:8px;color:var(--steel);white-space:nowrap;}
.tk-toast{position:fixed;z-index:50;left:50%;bottom:20px;transform:translateX(-50%);max-width:min(520px,calc(100vw - 24px));padding:10px 14px;background:var(--ink);color:var(--card);border:1px solid var(--line);border-radius:3px;box-shadow:0 8px 28px rgba(0,0,0,.24);font-size:13px;text-align:center;}
.tk-toast.bad{background:var(--hot);color:#fff;border-color:var(--hot);}
.tk-why{background:var(--card);border:1px dashed var(--line);border-left:2px solid var(--dl);padding:10px 12px;margin-top:9px;font-size:12.5px;}
.tk-why ul{margin:4px 0 0;padding-left:16px;}
.tk-why li{margin-bottom:2px;color:var(--steel);}
.tk-alert{background:var(--alert);border:1px solid var(--alert-line);border-radius:3px;padding:12px 14px;font-size:13px;margin-bottom:14px;}
.tk-alert b{display:block;font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--hot);margin-bottom:4px;}
.tk-meta{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;color:var(--steel);margin-bottom:12px;}
.tk-wdays{display:flex;gap:4px;flex-wrap:wrap;}
.tk-wd{font:inherit;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:12px;width:42px;padding:8px 0;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:2px;cursor:pointer;}
.tk-wd[aria-pressed="true"]{background:var(--deep);border-color:var(--deep);color:#fff;}
.tk-aerobic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0 12px;}
.tk-aerobic-grid .tk-logfield{margin-top:8px;}
.tk-subhead{font-size:13px;margin:16px 0 8px;}
.tk-coach-workspace{padding:0;overflow:hidden;}
.tk-coach-workspace>summary{display:flex;justify-content:space-between;gap:12px;padding:16px 18px;cursor:pointer;list-style:none;}
.tk-coach-workspace>summary span{font-size:11px;color:var(--steel);font-weight:400;}
.tk-coach-body{border-top:1px solid var(--line);padding:16px 18px;}
.tk-wide-label{display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--steel);margin-bottom:12px;}
.tk-wide-label input,.tk-revision-add input,.tk-coach-editor input,.tk-coach-editor select{font:inherit;padding:7px 8px;border:1px solid var(--line);border-radius:2px;background:var(--card);color:var(--ink);}
.tk-coach-editor{display:flex;align-items:end;gap:8px;flex-wrap:wrap;background:var(--surf);border:1px solid var(--line);padding:10px;margin:9px 0;}
.tk-coach-editor label{display:flex;flex-direction:column;gap:3px;font-size:10px;color:var(--steel);}
.tk-coach-editor input,.tk-coach-editor select{width:125px;}
.tk-coach-editor label:nth-child(2) input{width:210px;}
.tk-danger{color:var(--hot);}
.tk-client-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:-4px 0 12px;}
.tk-client{display:inline-flex;border:1px solid var(--line);background:var(--surf);}
.tk-client .tk-mini{padding:6px 8px;border:0;}
.tk-adaptation{padding:10px 12px;border-left:3px solid var(--deep);background:var(--surf);font-size:12px;margin-top:10px;}
.tk-adaptation.reduce,.tk-adaptation.recover{border-color:var(--hot);background:var(--alert);}
.tk-revision-add{display:flex;gap:8px;align-items:center;}
.tk-revision-add input{flex:1;min-width:180px;}
.tk-revisions{margin:10px 0 0;padding-left:18px;font-size:12px;color:var(--steel);}
.tk-revisions li{margin:5px 0;}
.tk-records{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-bottom:12px;}
.tk-records>div{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--surf);border:1px solid var(--line);font-size:11px;}
.tk-records span{color:var(--steel);}
.tk-plan-fact{font-size:12px;padding:8px 10px;background:var(--surf);border:1px solid var(--line);}
.tk-history-list{margin:12px 0;font-size:12px;}
.tk-history-list>summary{cursor:pointer;font-weight:700;}
.tk-history-list>div{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid var(--line);padding:7px 0;}.tk-rule b{display:block;font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--steel);margin-bottom:3px;}

.tk-presc{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0;}
.tk-presc>div{padding:12px;background:var(--surf);border:1px solid var(--line);border-radius:10px;min-width:0;}
.tk-presc dt{font-size:12px;color:var(--steel);font-weight:500;margin-bottom:5px;}
.tk-presc dd{font-size:23px;line-height:1.25;font-weight:750;font-variant-numeric:tabular-nums;letter-spacing:-.03em;margin:0;overflow-wrap:anywhere;}
.tk-presc-note{font-size:13px;color:var(--steel);margin:10px 0;}
.tk-presc-note strong{color:var(--ink);font-variant-numeric:tabular-nums;}
.tk-load>.tk-logfield{flex:1 1 100px;min-width:0;}
.tk-load>.tk-logfield input{width:100%;}
.tk-load>span,.tk-load>b{flex-basis:100%;}
.tk-load>b{background:var(--surf);color:var(--ink);padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:20px;}
.tk :is(input,select,textarea){accent-color:var(--deep);}
.tk :is(.tk-num,.tk-wnum,.tk-wide-label input,.tk-revision-add input,.tk-coach-editor input,.tk-coach-editor select){background:var(--input);border-color:var(--input-line);border-radius:8px;min-height:44px;font-size:16px;font-weight:600;}
.tk input::placeholder{color:var(--placeholder);opacity:1;font-size:13px;font-weight:400;}
.tk :is(input,select,textarea,button,summary):focus-visible{outline:3px solid var(--link);outline-offset:3px;}
.tk :is(.tk-opt,.tk-day,.tk-wd,.tk-theme){border-radius:8px;min-height:44px;font-size:13px;font-weight:600;}
.tk :is(.tk-opt,.tk-day,.tk-wd)[aria-pressed="true"]{box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);}
.tk-cta{border-radius:10px;font-weight:700;}
.tk-mini{min-height:40px;line-height:1.5;}
.tk-ex-action{display:inline-flex;align-items:center;padding:8px 14px;margin:10px 10px 0 0;border:1px solid var(--line);border-radius:8px;text-decoration:none;font-weight:600;}
.tk-ex-action:hover{background:var(--surf);border-color:var(--link);}
.tk-ex-action[aria-expanded="true"]{border-color:var(--link);background:var(--surf);}
.tk-exercise-log{display:block;}
.tk-logheading{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px;font-size:14px;}
.tk-logdone input{width:20px;height:20px;accent-color:var(--deep);}
.tk-exercise-log.is-done{border-color:var(--dl);}
.tk-set-row{display:grid;grid-template-columns:80px repeat(3,minmax(0,1fr));gap:12px;align-items:end;padding:12px 0;border-top:1px solid var(--line);}
.tk-set-row.tk-set-bodyweight{grid-template-columns:80px repeat(2,minmax(0,1fr));}
.tk-set-row input{width:100%;}
.tk-set-number{align-self:center;font-size:20px;font-variant-numeric:tabular-nums;}
.tk-set-number span{display:block;font-size:12px;font-weight:500;color:var(--steel);}
.tk-log-notes{display:grid;grid-template-columns:100px minmax(0,1fr);gap:12px;border-top:1px solid var(--line);padding-top:14px;}
.tk-note-field input{width:100%;font-size:16px;font-weight:400;}
.tk-session-log{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,2fr);margin-bottom:16px;align-items:end;}
.tk-session-log input{width:100%;}
.tk-journal-progress{padding:12px 14px;border-radius:10px;flex-wrap:wrap;}
.tk-journal-progress b{font-size:20px;font-variant-numeric:tabular-nums;}
.tk-import{padding:0;overflow:hidden;}
.tk-import summary{padding:16px 20px;cursor:pointer;font-size:14px;font-weight:600;}
.tk-import summary span{color:var(--link);font-size:13px;margin-left:10px;}
.tk-import .tk-p{margin:0 20px 8px;}
.tk-import .tk-mini{margin:0 20px 16px;}
.tk-wk b{font-size:12px;font-weight:700;}
.tk-rir{font-size:28px;}
.tk-rir small{font-size:13px;}
.tk-stat-grid b{font-size:28px;font-variant-numeric:tabular-nums;}
.tk-stat-grid span{font-size:12px;}
.tk-meta{font-family:inherit;font-size:13px;}
.tk-volnum{font-size:15px;font-weight:700;color:var(--ink);}
@media (max-width:680px){
 .tk-main{padding:16px 12px 80px;}
 .tk-card{padding:18px;}
 .tk-card.tk-import,.tk-card.tk-coach-workspace{padding:0;}
 .tk-ex{padding:16px;display:block;}
 .tk-idx{margin-bottom:8px;}
 .tk-presc{grid-template-columns:repeat(2,minmax(0,1fr));}
 .tk-presc dd{font-size:22px;}
 .tk-session-log{grid-template-columns:repeat(2,minmax(0,1fr));}
 .tk-session-log .tk-note-field{grid-column:1/-1;}
 .tk-exercise-log{padding:12px;}
 .tk-set-row{grid-template-columns:38px repeat(3,minmax(0,1fr));gap:8px;}
 .tk-set-row.tk-set-bodyweight{grid-template-columns:38px repeat(2,minmax(0,1fr));}
 .tk-set-number span{font-size:10px;}
 .tk-set-row .tk-logfield{min-width:0;font-size:11px;overflow-wrap:anywhere;}
 .tk-set-row input{padding:8px 5px;font-size:16px;}
 .tk-import summary span{display:block;margin:4px 0 0;}
 .tk-revision-add{flex-wrap:wrap;}
 .tk-revision-add input{min-width:0;width:100%;}
}


.tk-journal-toggle{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 20px;}
.tk-journal-toggle strong{font-size:14px;}
.tk-journal-toggle p{font-size:13px;color:var(--steel);margin:4px 0 0;}
.tk-journal-toggle button{flex-shrink:0;}
.tk-edit-action,.tk-edit-action:hover,.tk-edit-action[aria-expanded="true"]{background:var(--deep);border-color:var(--deep);color:#fff;}
.tk-planned-load{display:flex;align-items:baseline;flex-wrap:wrap;gap:12px;padding:10px 12px;margin:12px 0;border:1px solid var(--line);border-radius:8px;background:var(--surf);}
.tk-planned-load span{font-size:12px;color:var(--steel);}
.tk-planned-load strong{font-size:20px;font-variant-numeric:tabular-nums;}
.tk-anchor-settings{flex-basis:100%;min-width:0;border-top:1px solid var(--line);padding-top:10px;}
.tk-anchor-settings summary,.tk-coach-section summary,.tk-plan-adjustments summary{cursor:pointer;font-size:13px;font-weight:600;padding:10px 0;}
.tk-coach-editor .tk-anchor-settings .tk-logfield input{width:100%;}
.tk-coach-editor .tk-anchor-settings .tk-logfield{font-size:12px;}
.tk-coach-section{border-top:1px solid var(--line);padding:2px 0;}
.tk-coach-section[open]{padding-bottom:12px;}
.tk-plan-adjustments{border-top:1px solid var(--line);margin-top:12px;}
@media (max-width:680px){.tk-journal-toggle{flex-direction:column;align-items:stretch;gap:12px;}.tk-coach-workspace>summary{flex-wrap:wrap;gap:4px;}}

@media (max-width:760px){.tk{background-position:left top;background-size:auto 100vh;background-attachment:scroll;}.tk::before{width:100vw;opacity:var(--center-mobile-opacity);mask-image:none;-webkit-mask-image:none;background-position:center top;}.tk-bar{background:var(--bar-mobile);backdrop-filter:none;-webkit-backdrop-filter:none}.tk-card,.tk-card-dense{background:var(--card-mobile);backdrop-filter:none;-webkit-backdrop-filter:none}}
@media (prefers-reduced-transparency:reduce){.tk-bar{background:var(--bar);backdrop-filter:none;-webkit-backdrop-filter:none}.tk-card,.tk-card-dense{background:var(--card);backdrop-filter:none;-webkit-backdrop-filter:none}}
@media (max-width:520px){.tk-volrow{grid-template-columns:92px 1fr 52px;}.tk-ramp{height:92px;}.tk-credit{right:8px;bottom:8px;padding:6px 9px;}.tk-credit strong{font-size:12px;} .tk-warm-notes,.tk-home-kit-grid,.tk-reading-grid,.tk-health-grid,.tk-aerobic-grid,.tk-stat-grid,.tk-records{grid-template-columns:1fr;}.tk-progress-list>div{grid-template-columns:1fr;gap:4px;}.tk-home-grid{grid-template-columns:1fr;}.tk-reading summary{padding:14px;}.tk-reading-body{padding:12px 14px 15px;}.tk-logfield{flex:1;min-width:64px}.tk-logfield input{width:100%;}.tk-toast{bottom:58px;}}

@media (max-width:680px){.tk-credit{position:absolute;right:12px;bottom:12px;}}
@media (max-width:400px){
 .tk-main{padding:12px 8px 80px;}
 .tk-card{padding:12px;}
 .tk-ex{padding:12px;}
 .tk-exercise-log{padding:10px;}
 .tk-set-row{grid-template-columns:26px minmax(0,1.25fr) repeat(2,minmax(0,1fr));gap:6px;}
 .tk-set-row.tk-set-bodyweight{grid-template-columns:26px repeat(2,minmax(0,1fr));}
 .tk-set-number span{font-size:9px;}
 .tk-set-row input{padding:8px 4px;}
 .tk-log-notes{grid-template-columns:1fr;}
 .tk-log-notes input{width:100%;}
}

@media (prefers-reduced-motion:reduce){.tk-wk span{transition:none;}}
`;
