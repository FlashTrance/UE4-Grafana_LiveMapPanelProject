# UE4->Grafana Live Map Panel Project

This repo contains samples of work I did as part of a federal contract for MFLEETS (obviously nothing here is covered under an NDA). This was an R&D project to develop a real-time tracking dashboard for police supervisors. 

For the POC, an intern and I developed a simulation in Unreal Engine 4 that used a plugin called "StreetMap" to generate a map of Kansas City that was in real scale inside of the engine. I then added waypoints with real GPS coordinates to the map and developed an autonomous vehicle that drove around and sent information back via HTTP to a REST API connected to a POSTGRESQL DB running on AWS. Our Grafana dashboard (also running on AWS) was then able to pull the data directly from the DB and display it in real-time.
