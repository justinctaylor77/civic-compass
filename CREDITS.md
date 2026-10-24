# Credits

## Hero photo (v5): "Capitol Dome"
- **What:** U.S. Capitol dome and columns with an American flag on a flagpole, clear blue sky. Used (cropped/resized) as the home-page hero in `public/img/hero/`.
- **Photographer / creator:** Architect of the Capitol (Flickr account "USCapitol"). Taken 9 July 2012, 14:20. Credit line: **"Architect of the Capitol."**
- **Licence:** Public domain. Work of an employee of the Architect of the Capitol made in the course of official duties, i.e. a U.S. federal government work (17 U.S.C. § 105). The Wikimedia Commons file page states "all images created or made by the Architect of the Capitol are in the public domain in the United States"; the Flickr upload carries Flickr's "United States Government Work" licence (checked by FlickreviewR on Commons 8 Oct 2012, and Flickr licence id 8 on the photo page).
- **AOC usage note (kept on the Commons page and honoured here):** "made available for educational, scholarly, news or personal purposes (not advertising or any other commercial use) ... photographic credit line should read 'Architect of the Capitol' ... may not be used in any way that would imply endorsement by the Architect of the Capitol or the United States Congress of a product, service or point of view." Civic Compass is a free, non-commercial, nonpartisan voter-education tool and shows a no-endorsement statement on About & Sources.
- **Source URLs:**
  - Commons file page: https://commons.wikimedia.org/wiki/File:Flickr_-_USCapitol_-_Capitol_Dome_(1).jpg
  - Original (3000x2000, SHA-1 `a6906679cfe0d6a8c7d7a5a2f4f7dda9538b5b02`): https://upload.wikimedia.org/wikipedia/commons/f/f8/Flickr_-_USCapitol_-_Capitol_Dome_%281%29.jpg
  - Flickr: https://www.flickr.com/photos/uscapitol/7537241496/
- **Modifications:** two crops (1:1 desktop, 3:2 mobile), resized to 480/960/1600 px wide, re-encoded as AVIF/WebP/JPEG (`python3 scripts/gen-hero.py`, verifies the SHA-1). Navy gradient overlay and compass-star accent are added in CSS/SVG, not baked into the files.
- **Shown at:** home page hero caption, About & Sources -> "Photo credit".

## Election results data (v6)
- **MIT Election Data + Science Lab (MEDSL)**, official precinct-level returns for 2022 and 2024, released under CC0 (https://electionlab.mit.edu/data; https://github.com/MEDSL/2022-elections-official, https://github.com/MEDSL/2024-elections-official). Aggregated by `scripts/build-results.py` into `data/results/`. Citation: MIT Election Data and Science Lab, U.S. elections official returns.
- County candidate lists (Salt Lake, Cache, Washington, Utah, Weber, Franklin OH, Laramie WY): public records of the county election offices, linked per file in `data/county/`. Utah retention links go to the Utah Judicial Performance Evaluation Commission.
- Ballotpedia text remains CC BY-NC-SA 3.0 (unchanged).

## Other
- Logo / brand art: Justin Taylor (`brand/logo-approved.jpg`), used as approved.
- Fonts: Montserrat and Atkinson Hyperlegible (SIL Open Font License), self-hosted in `public/fonts/`.
- Ribbon band, topo background, compass loader and dividers: original art generated in this repo (`scripts/gen-ribbon.js`, `scripts/gen-topo.js`).
- Data sources are listed on the in-app About & Sources page.
