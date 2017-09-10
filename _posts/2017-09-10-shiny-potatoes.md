---
title: Shiny Potatoes
permalink: /shiny-potatoes/
shortUrl: http://goo.gl/7pZmG6
comments: true
---

[![Shiny]({{ teamtvblogs.github.io }}/assets/img/shiny-header.png)]({{ teamtvblogs.github.io }}/shiny-potatoes/)

In an effort to explore the vast possibilities of R Shiny, I built a very simple Shiny app using data from a survey designed and conducted with colleagues in Ethiopia. The data explores the relationships between different seed potato storage technologies (which turn out to be very important!) under different hypothetical future conditions.

<!--more-->
The goal of this particular analysis was to explore the impact of a low-tech seed potato storage technology called Diffuse Light Storehouses (DLS), which allow rural Ethiopian farmers to dramatically improve their yields. This is because potatoes are planted from the tubers of the last growing season, not from "seed" as we know it. These tubers are much more sensitive than true seed, and require good storage conditions to meet their yield potential.

Consequently, we compared the profitability of building DLS independently, building DLS with the support of an NGO program which subsidized construction, and traditional storage methods. Profitability depends on a variety of future conditions including labor wage rates, materials costs, sale and purchase prices, and yields. Many of these variables vary year-to-year in a way that depends on the previous year - e.g. the wage rate in time t+1 depends on wages in time t. We can model these changes over time using Markov Chain processes - I chose geometric brownian motion (the image shows an example of this).

![GBM]({{ teamtvblogs.github.io }}/assets/img/gbm.png)

Using bootstraps of our own data, as well as available external information, we created three plausble scenarios for the next 10 years for potato growers: optimistic, medium, and pessimistic. We then estimated profitability across our three farmer types (NGO-supported DLS, independent DLS, and traditional) for each of the three scenarios. Shiny provided a way to visualize the impact of different assumed discount rates, which can be highly variable in developing country situations.

The integration of Shiny with my existing model was pretty simple, given the extensive documentation online and the fact that our output was limited to a single grouped boxplot and results table:

[![Shiny-app]({{ teamtvblogs.github.io }}/assets/img/shiny-app.png)](https://tobylunt.shinyapps.io/shinyapp/)

For an interactive version hosted (for free!) at shinyapps.io, [head this way](https://tobylunt.shinyapps.io/shinyapp/). Despite the limitations both in form and function of this app, it was enough to demonstrate the amazing power not only for sharing information - but also for uncovering patterns and trends that would be more difficult to discern without good visualization.  
<br/>
