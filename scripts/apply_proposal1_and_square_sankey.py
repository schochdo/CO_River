import re

print("--- Updating web/sankey.html to Proposal 1 & Square Architecture ---")

with open("web/test_proposal1.html", "r") as f:
    proposal1_content = f.read()

# Extract the nodes and links from test_proposal1.html
nodes_match = re.search(r"(const nodes = \[[\s\S]*?\];)", proposal1_content)
links_match = re.search(r"(const links = \[[\s\S]*?\];)", proposal1_content)

with open("web/sankey.html", "r") as f:
    sankey = f.read()

# 1. Update Column Headers
sankey = re.sub(
    r"<div>2\. Regulatory Storage \(Lake Powell\) &amp; Compact Pool<\/div>\s*<div>3\. Regional Conveyance &amp; Distribution Hub \(Lake Mead\)<\/div>",
    "<div>2. Compact Basin Allocations</div>\n          <div>3. Regional Conveyance Conduits &amp; Losses</div>",
    sankey
)

# 2. Update Nodes & Links
sankey = re.sub(r"const nodes = \[[\s\S]*?\];", nodes_match.group(1), sankey)
sankey = re.sub(r"const links = \[[\s\S]*?\];", links_match.group(1), sankey)

# 3. Square Styling in SVG
# Outer frame rx: 6 -> 2
sankey = re.sub(r'(\.attr\("rx",\s*)6(\))', r'\g<1>2\2', sankey)
# Node rect rx: 3 -> 1
sankey = re.sub(r'(\.attr\("rx",\s*)3(\))', r'\g<1>1\2', sankey)

# 4. Square Styling in HTML
sankey = sankey.replace("rounded-xl", "rounded-xs")
sankey = sankey.replace("rounded-lg", "rounded-xs")
sankey = sankey.replace("rounded-md", "rounded-xs")
sankey = sankey.replace("rounded-full", "rounded-xs")

with open("web/sankey.html", "w") as f:
    f.write(sankey)

print("Successfully updated web/sankey.html with Proposal 1 and Square Architecture.")
