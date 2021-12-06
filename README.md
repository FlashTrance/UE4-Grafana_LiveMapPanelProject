# UE4->Grafana Live Map Panel Project

Excerpts from the video presentation and live demonstrations I did, which include explanations of the UE4 source code and process, can be found here: https://youtu.be/LHpK8iGORKM

This repo contains samples of work I did as part of a federal contract for MFLEETS (nothing here is covered under an NDA, but some code has been altered where necessary). This was an R&D project to develop a real-time tracking dashboard for police supervisors. 

For the POC, an intern and I developed a simulation in Unreal Engine 4 that used a plugin called "StreetMap" to generate a map of Kansas City in real scale inside of the engine. I customized the plugin to generate waypoint actors with real GPS coordinates alongside the map. I also developed an autonomous vehicle pawn that drove around and sent telemetry data via HTTP to an instance of Prometheus (a program that can collect and store time-series data) running on AWS. Our Grafana dashboard (also running on AWS) was then able to pull the data directly from Prometheus and display it in real-time.
