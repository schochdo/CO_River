#!/usr/bin/env python3
import re

def apply_fix():
    path = "web/sankey.html"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Compact Mexico and System Losses display names
    content = content.replace(
        'name: "1944 Mexico Treaty",\n          displayName: "Mexico (1944 Treaty)",',
        'name: "1944 Mexico Treaty",\n          displayName: "Mexico",',
    )
    content = content.replace(
        'name: "System Losses & Evaporation",\n          displayName: "System Losses & Evaporation",',
        'name: "System Losses & Evaporation",\n          displayName: "System Losses",',
    )

    # 2. Update bracket rendering to be centered on the bar with text-anchor middle and white halo
    old_bracket_code = """      // Upper Basin Bracket (Blue #0284c7)
      svg.append("path")
        .attr("d", "M " + (width - 24) + " " + (coNode.y0 + 2) + " L " + (width - 16) + " " + (coNode.y0 + 2) + " L " + (width - 16) + " " + (nmNode.y1 - 2) + " L " + (width - 24) + " " + (nmNode.y1 - 2))
        .attr("fill", "none")
        .attr("stroke", "#0284c7")
        .attr("stroke-width", 2.5);

      svg.append("text")
        .attr("x", width - 28)
        .attr("y", (coNode.y0 + nmNode.y1) / 2)
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90 " + (width - 28) + " " + ((coNode.y0 + nmNode.y1) / 2) + ")")
        .attr("font-size", "10px")
        .attr("font-weight", "900")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#0284c7")
        .text("UPPER BASIN (4.50 MAF)");

      // Lower Basin Bracket (Orange #ea580c)
      svg.append("path")
        .attr("d", "M " + (width - 24) + " " + (caNode.y0 + 2) + " L " + (width - 16) + " " + (caNode.y0 + 2) + " L " + (width - 16) + " " + (lossNode.y1 - 2) + " L " + (width - 24) + " " + (lossNode.y1 - 2))
        .attr("fill", "none")
        .attr("stroke", "#ea580c")
        .attr("stroke-width", 2.5);

      svg.append("text")
        .attr("x", width - 28)
        .attr("y", (caNode.y0 + lossNode.y1) / 2)
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90 " + (width - 28) + " " + ((caNode.y0 + lossNode.y1) / 2) + ")")
        .attr("font-size", "10px")
        .attr("font-weight", "900")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#ea580c")
        .text("LOWER BASIN & DELIVERIES (10.40 MAF)");"""

    new_bracket_code = """      // Upper Basin Bracket (Blue #0284c7) - Centered on bar, zero text overlap
      const yMidUpper = (coNode.y0 + nmNode.y1) / 2;
      svg.append("path")
        .attr("d", "M " + (width - 24) + " " + (coNode.y0 + 2) + " L " + (width - 16) + " " + (coNode.y0 + 2) + " L " + (width - 16) + " " + (nmNode.y1 - 2) + " L " + (width - 24) + " " + (nmNode.y1 - 2))
        .attr("fill", "none")
        .attr("stroke", "#0284c7")
        .attr("stroke-width", 2.5);

      svg.append("text")
        .attr("x", width - 28)
        .attr("y", yMidUpper)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90 " + (width - 28) + " " + yMidUpper + ")")
        .attr("font-size", "10px")
        .attr("font-weight", "900")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#0284c7")
        .style("paint-order", "stroke fill")
        .style("stroke", "#ffffff")
        .style("stroke-width", "3.5px")
        .style("stroke-linejoin", "round")
        .text("UPPER BASIN (4.50 MAF)");

      // Lower Basin Bracket (Orange #ea580c) - Centered on bar, zero text overlap
      const yMidLower = (caNode.y0 + lossNode.y1) / 2;
      svg.append("path")
        .attr("d", "M " + (width - 24) + " " + (caNode.y0 + 2) + " L " + (width - 16) + " " + (caNode.y0 + 2) + " L " + (width - 16) + " " + (lossNode.y1 - 2) + " L " + (width - 24) + " " + (lossNode.y1 - 2))
        .attr("fill", "none")
        .attr("stroke", "#ea580c")
        .attr("stroke-width", 2.5);

      svg.append("text")
        .attr("x", width - 28)
        .attr("y", yMidLower)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90 " + (width - 28) + " " + yMidLower + ")")
        .attr("font-size", "10px")
        .attr("font-weight", "900")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#ea580c")
        .style("paint-order", "stroke fill")
        .style("stroke", "#ffffff")
        .style("stroke-width", "3.5px")
        .style("stroke-linejoin", "round")
        .text("LOWER BASIN & DELIVERIES (10.40 MAF)");"""

    if old_bracket_code in content:
        content = content.replace(old_bracket_code, new_bracket_code)
        print("Replaced bracket code successfully.")
    else:
        print("Warning: old_bracket_code not matched exactly. Trying regex.")
        content = re.sub(
            r'// Upper Basin Bracket[\s\S]*?LOWER BASIN & DELIVERIES \(10\.40 MAF\)"\);',
            new_bracket_code.strip(),
            content
        )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated web/sankey.html")

if __name__ == "__main__":
    apply_fix()
