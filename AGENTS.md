<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->


# 블로그 UI vs 주식센터 테마 분리 절대 규칙

## 1. 블로그 사이트 (Blog UI) - 절대 화이트/라이트 테마
- 적용 대상: 메인 홈(index.html), 상세 글/가이드(posts/*.html), 키워드센터, 프롬프트센터 등 블로그 관련 모든 화면.
- 색상 가이드:
  - 배경: 밝은 화이트/아이보리 (#ffffff, #f8fafc)
  - 카드/컨테이너: 깨끗한 순백색 (#ffffff)
  - 테두리: 깔끔한 연회색 (#e2e8f0, #cbd5e1)
  - 텍스트: 선명한 짙은 슬레이트/차콜 (#0f172a, #1e293b, #475569)
  - 포인트: 세련된 블루 (#0284c7) 및 에메랄드 (#059669)
- ❌ **절대 금지**: 고동색, 딥브라운, 웜베이지(#1a1412, #2a201c, #352924, #3e312b, #4a3b34, #d4a373 등)는 **블로그 화면에 절대로 적용하지 않는다.**

## 2. 주식센터 (Stock UI)
- 적용 대상: 오직 stock-intelligence, public/stock.html, css/stock.css 등 주식분석센터 화면.
- 고동색 & 베이지 다크 테마는 **오직 주식센터에만** 한정 적용한다.
