# Chivalry 2 Stats Viewer

View every stat Chivalry 2 tracks about you, straight from your save file.

**Live site: https://chefjulio.github.io/chivalry2statviewer/**

The game keeps a running lifetime tally (kills, deaths, playtime, weapon and
class breakdowns, faction wins, and more) in a small binary file called
`FlavorStats`. This page parses that file entirely in your browser - nothing
is uploaded anywhere - and presents it as a dashboard:

- Headline tiles: kills, K/D, total playtime, win rate, damage, matches
- Combat overview and faction win/loss records
- Matches completed by game mode, plus FFA podium finishes
- Sortable class breakdown (playtime, kills, takedowns, deaths, K/D per subclass)
- Sortable, searchable weapon breakdown with relative kill bars
- Challenge counters and any other stats the game adds, so nothing is dropped

## Finding your stats file

1. Press `Win+E` to open File Explorer and paste this into the address bar:
   `%LOCALAPPDATA%\Chivalry 2\Saved\Cloud`
2. Look for files starting with `FlavorStats_`. If there is more than one,
   yours is the largest, most recently modified one that does **not** end in
   `_local`. (Smaller ones belong to other accounts that have played on your
   PC; `_local` files are the game's own working copies.)
3. Drag the file onto the drop zone on the page.

## Known data quirks

These come from the game's own tracking, not the parser:

- **Weapon deaths** are recorded very sparsely (a few percent of actual
  deaths) and appear to count deaths while *holding* a weapon rather than
  deaths caused by it. The page computes and shows the coverage for your file.
- **Weapon kills** cover roughly 85-90% of total kills; the remainder
  (siege weapons, fists, environmental kills) has no weapon attribution.

## Development

No build step. Clone and open `index.html` in a browser.

- `parser.js` - extracts the flat stat map from the binary save file
- `app.js` - grouping, sorting, formatting, rendering
- `style.css` - theme

## Credits

- Original viewer by [iwishforahat](https://github.com/iwishforahat/chivalry2statviewer);
  this fork rewrote the presentation layer.
- Stat key reference from [ChivDeepStat](https://github.com/knutschbert/ChivDeepStat).
