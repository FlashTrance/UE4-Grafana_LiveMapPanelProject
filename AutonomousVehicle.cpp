// A SAMPLE OF THE CODE USED TO CREATE THE VEHICLE IN THE UE4 SIMULATION

// Constructor()
ADA_Vehicle_Basic::ADA_Vehicle_Basic()
{
	// Tick()
	PrimaryActorTick.bCanEverTick = true;

	// Initialize Variables
	MASS = 1500;		      // kg
	MAX_FORCE = 5000;	      // N
	MAX_SPEED = 20;		      // m/s
	MIN_TURN_RADIUS = 5;      // m

	RRCoeff = 0.0125;	      // Approx. rolling resistance coeff for car tires on concrete

	TrackInterval = 0.5f;     // Time between geolocation "pings" (seconds)
	INIT_REQ_INTERVAL = 0.0f; // Time before first HTTP request is sent
	REQUEST_INTERVAL = 8.0f;  // Time between subsequent HTTP requests after first request (seconds)
}


// BEGIN PLAY()
void ADA_Vehicle_Basic::BeginPlay()
{
	Super::BeginPlay();

	// Post-Constructor calculations
	DragCoeff = MAX_FORCE / (MAX_SPEED * MAX_SPEED);
	NormalForce = G * MASS;

	// Additional variable setup
	StartMinute = Timestamp.UtcNow().GetMinute();
	StartHour = Timestamp.UtcNow().GetHour();

	// Start timer to track geolocation
	FTimerHandle GeoLocTimerHandle;
	GetWorldTimerManager().SetTimer(GeoLocTimerHandle, this, &ADA_Vehicle_Basic::TrackGeoLocation, TrackInterval, true);

	// Set an initial Waypoint to move to
	if (InitialPoint)
	{
		CurrentWaypoint = InitialPoint;
		if (bIsAutonomous) { StartAutonomousMovement(); }
	}
	else
	{
		GM = Cast<ADA_Vehicle_SimGameModeBase>(GetWorld()->GetAuthGameMode());
		if (GM)
		{
			for (auto Waypoint : GM->WaypointArray)
			{
				if (Waypoint)
				{
					CurrentWaypoint = Waypoint;

					// Start BP autonomous logic
					if (bIsAutonomous) { StartAutonomousMovement(); }
					break;
				}
			}
		}
	}
	
	// Start timer to send first HTTP request
	if (bSendRequests)
	{
		GetWorldTimerManager().SetTimer(HttpTimerHandle, this, &ADA_Vehicle_Basic::SendFirstHTTPRequest, INIT_REQ_INTERVAL, false);
	}
}


// INPUT COMPONENT
void ADA_Vehicle_Basic::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	PlayerInputComponent->BindAxis("DriveFwd", this, &ADA_Vehicle_Basic::DriveForward);
	PlayerInputComponent->BindAxis("DriveRight", this, &ADA_Vehicle_Basic::DriveRight);
	PlayerInputComponent->BindAction("ToggleLogging", IE_Pressed, this, &ADA_Vehicle_Basic::ToggleLogging);
}

// Drive Forward
void ADA_Vehicle_Basic::DriveForward(float InputVal)
{
	if (!bIsAutonomous) { FwdInput = InputVal; }
}

// Drive Right
void ADA_Vehicle_Basic::DriveRight(float InputVal)
{
	if (!bIsAutonomous) { TurnInput = InputVal; }
}

// Logging
void ADA_Vehicle_Basic::ToggleLogging()
{
	bLoggingEnabled = !bLoggingEnabled;
}


// DATA FUNCTIONS
// Track GeoLocatoin
void ADA_Vehicle_Basic::TrackGeoLocation()
{
	// Check for collision
	TArray<AActor*> FoundPoints;
	UKismetSystemLibrary::SphereOverlapActors(GetWorld(), GetActorLocation(), 3000.0f, TArray<TEnumAsByte<EObjectTypeQuery>>(),
		AGeoLocPoint::StaticClass(), TArray<AActor*>(), FoundPoints);

	// Get closest GeoLocPoint to vehicle
	if (FoundPoints.Num() < 3 && FoundPoints.Num() > 0)
	{
		AGeoLocPoint* NewPoint = Cast<AGeoLocPoint>(FoundPoints[0]);
		if (NewPoint && !NewPoint->bDontUseForGeoTracking)
		{
			ClosestPoint = Cast<AGeoLocPoint>(FoundPoints[0]);
		}
	}
	else if (FoundPoints.Num() > 0)
	{
		for (auto GeoLocPoint : FoundPoints)
		{
			AGeoLocPoint* CurPoint = Cast<AGeoLocPoint>(GeoLocPoint);
			if (CurPoint && !CurPoint->bDontUseForGeoTracking)
			{
				float CurrentDistance;
				if (!ClosestPoint || ClosestDistance == -1)
				{
					ClosestPoint = CurPoint;
					ClosestDistance = FVector::DistSquared(CurPoint->GetActorLocation(), GetActorLocation());
				}
				else
				{
					CurrentDistance = FVector::DistSquared(CurPoint->GetActorLocation(), GetActorLocation());
					if (CurrentDistance < ClosestDistance)
					{
						ClosestDistance = CurrentDistance;
						ClosestPoint = CurPoint;
					}
				}
			}
		}

		if (ClosestPoint) { CurrentLocation = ClosestPoint->GeoLocation; }
		ClosestDistance = -1;
	}
}


// Set Next Waypoint
void ADA_Vehicle_Basic::SetNextWaypoint()
{
	AGeoLocPoint* Waypoint;
	uint8 TotalIndices = CurrentWaypoint->WaypointRefs.Num();
	TArray<uint8> IndexArray;

	if (TotalIndices > 0)
	{
		// Generate array of indices
		for (int i = 0; i < TotalIndices; i++)
		{
			IndexArray.Add(i);
		}
		uint8 RandomIndex;

		// Get a random index from array
		RandomIndex = FMath::RandRange(0, IndexArray.Num() - 1);
		Waypoint = CurrentWaypoint->WaypointRefs[RandomIndex];
		CurrentWaypoint = Waypoint;
		FindNextWaypoint();
	}
}


// TICK()
void ADA_Vehicle_Basic::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	// PHSYICS
	// Resistance
	DragCoeff = MAX_FORCE / (MAX_SPEED * MAX_SPEED);
	Force = GetActorForwardVector() * MAX_FORCE * FwdInput;
	Force += -Velocity.GetSafeNormal() * Velocity.SizeSquared() * DragCoeff; // Air
	Force += -Velocity.GetSafeNormal() * RRCoeff * NormalForce;				 // Rolling

	// Acceleration & Velocity
	Acceleration = Force / MASS;
	Velocity = Velocity + (Acceleration * DeltaTime);
	DotProdAcceleration = UKismetMathLibrary::Dot_VectorVector(Acceleration, GetActorForwardVector()); // For checking if acceleration is negative

	// Rotation (turning)
	float dX = FVector::DotProduct(GetActorForwardVector(), Velocity) * DeltaTime;
	TurnAngle = (dX / MIN_TURN_RADIUS) * TurnInput; // d(theta) = dx / r
	FQuat RotDelta(GetActorUpVector(), TurnAngle);
	Velocity = RotDelta.RotateVector(Velocity);		// Rotating velocity vector along with car; prevents "drifting" during a turn.

	// Update location and rotation every frame
	FVector NewLoc = Velocity * 100 * DeltaTime;
	AddActorWorldOffset(NewLoc);
	AddActorWorldRotation(RotDelta);

	// Update Distance Traveled
	if (Velocity.Size() > 0.005) { DistanceTraveled += Velocity.Size() * DeltaTime; }

	// Calculate Compass Direction
	DirectionDegrees = GetActorRotation().Yaw + 90.0f;
	if (DirectionDegrees < 0)
	{
		// Handle values between W and N (270 to 359) which are negative in Unreal Engine coord. system
		DirectionDegrees += 360.0f;
	}

	// Geolocation Tracking sphere
	// DrawDebugSphere(GetWorld(), GetActorLocation(), 2000.0f, 20, FColor::Red, false, 0.2);

	// LOGGING
	if (bLoggingEnabled)
	{
		if (CurrentWaypoint)
		{
			if (!CurrentWaypoint->POIName.IsEmpty()) { GEngine->AddOnScreenDebugMessage(-1, 0.005f, FColor::Green, FString::Printf(TEXT("Current Waypoint: %s"), *CurrentWaypoint->POIName)); }
			else if (!CurrentWaypoint->StreetName.IsEmpty()) { GEngine->AddOnScreenDebugMessage(-1, 0.005f, FColor::Green, FString::Printf(TEXT("Current Waypoint: %s"), *CurrentWaypoint->StreetName)); }
		}
		GEngine->AddOnScreenDebugMessage(-1, 0.005f, FColor::Magenta, FString::Printf(TEXT("Speed: %.2fm/s"), Velocity.Size()));
		GEngine->AddOnScreenDebugMessage(-1, 0.005f, FColor::Blue, FString::Printf(TEXT("Acceleration: %.2fm/s*s"), Acceleration.Size()));
		GEngine->AddOnScreenDebugMessage(-1, 0.005f, FColor::Orange, FString::Printf(TEXT("Lat: %f, Long: %f"), CurrentLocation.X, CurrentLocation.Y));
		GEngine->AddOnScreenDebugMessage(-1, 0.005f, FColor::Red, FString::Printf(TEXT("Distance Traveled: %.2fm"), DistanceTraveled));
		GEngine->AddOnScreenDebugMessage(-1, 0.005f, FColor::Purple, FString::Printf(TEXT("Direction (Degrees): %.2f"), DirectionDegrees));
		GEngine->AddOnScreenDebugMessage(-1, 0.005f, FColor::Yellow, FString::Printf(TEXT("Vehicle ID: %s"), *this->GetFName().ToString()));
	}
}


// SEND HTTP REQUESTS 
void ADA_Vehicle_Basic::SendFirstHTTPRequest()
{
	// Periodically send POST requests to local REST app
	if (!HttpRef)
	{
		// Setup Spawn Parameters
		FActorSpawnParameters SpawnParams;
		SpawnParams.Owner = this;
		SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

		// Spawn HTTPService Actor
		HttpRef = GetWorld()->SpawnActor<ADA_HttpService>(ADA_HttpService::StaticClass(), FVector::ZeroVector,
			FRotator::ZeroRotator, SpawnParams);

		// Send first HTTP request and start up looped timer
		SendHTTPRequest();
		GetWorldTimerManager().SetTimer(HttpTimerHandle, this, &ADA_Vehicle_Basic::SendHTTPRequest, REQUEST_INTERVAL, true);
	}	
}

void ADA_Vehicle_Basic::SetRequestInterval()
{
	GetWorldTimerManager().ClearTimer(HttpTimerHandle);
	GetWorldTimerManager().SetTimer(HttpTimerHandle, this, &ADA_Vehicle_Basic::SendHTTPRequest, REQUEST_INTERVAL, true);
}


void ADA_Vehicle_Basic::SendHTTPRequest()
{
	if (HttpRef)
	{
		// Setup Struct
		FDataFormatStruct DataToSend;
		DataToSend.Asset = this->GetFName().ToString();
		DataToSend.Date = GetCurrentMonth() + " " + FString::FromInt(Timestamp.UtcNow().GetDay()) + " " 
			+ FString::FromInt(Timestamp.UtcNow().GetYear());
		DataToSend.DateAndTime = DataToSend.Date + " " + GetAdjustedTime();
		DataToSend.POI = CurrentWaypoint->POIName;
		DataToSend.EventType = ClosestPoint->EventType;
		if (!CurrentWaypoint->StreetName.IsEmpty()) { DataToSend.Street = ClosestPoint->StreetName; }
		DataToSend.SpeedKMH = FString::SanitizeFloat(Velocity.Size(), 1);
		DataToSend.SpeedMPH = FString::SanitizeFloat(Velocity.Size() / 1.609f, 1);
		DataToSend.SpeedLimitKMH = FString::SanitizeFloat(CurrentWaypoint->SpeedLimitKMH, 1);
		DataToSend.SpeedLimitMPH = FString::SanitizeFloat(CurrentWaypoint->SpeedLimitKMH / 1.609f, 1);;
		DataToSend.DistanceKM = FString::SanitizeFloat(DistanceTraveled / 1000.0f, 1);
		DataToSend.DistanceMI = FString::SanitizeFloat(DistanceTraveled / 1609.0f, 1);
		DataToSend.Heading = FString::SanitizeFloat(DirectionDegrees, 1);
		DataToSend.Direction = GetDirectionFromHeading(DirectionDegrees);
		DataToSend.OdometerKM = FString::SanitizeFloat(DistanceTraveled, 1);
		DataToSend.OdometerMI = FString::SanitizeFloat(DistanceTraveled / 1.609f, 1);
		if (Velocity.Size() < 0.005f) { DataToSend.Ignition = "OFF"; }
		DataToSend.Latitude = FString::SanitizeFloat(CurrentLocation.X);
		DataToSend.Longitude = FString::SanitizeFloat(CurrentLocation.Y);
		DataToSend.TotalTimeWorked = GetTimeWorkedInMinutes();
		DataToSend.CurrentIncidents = FString::FromInt(IncidentsAddressed);

		// Send Struct data to HttpService for processing
		HttpRef->PostInfoToServer(DataToSend);
	}
}


// HELPER FUNCTIONS
FString ADA_Vehicle_Basic::GetCurrentMonth()
{
	switch (Timestamp.UtcNow().GetMonth())
	{
	case 1:
		CurrentMonth = "Jan";
		break;
	case 2:
		CurrentMonth = "Feb";
		break;
	case 3:
		CurrentMonth = "Mar";
		break;
	case 4:
		CurrentMonth = "Apr";
		break;
	case 5:
		CurrentMonth = "May";
		break;
	case 6:
		CurrentMonth = "Jun";
		break;
	case 7:
		CurrentMonth = "Jul";
		break;
	case 8:
		CurrentMonth = "Aug";
		break;
	case 9:
		CurrentMonth = "Sep";
		break;
	case 10:
		CurrentMonth = "Oct";
		break;
	case 11:
		CurrentMonth = "Nov";
		break;
	case 12:
		CurrentMonth = "Dec";
		break;
	default:
		break;
	}

	return CurrentMonth;
}

int ADA_Vehicle_Basic::GetCurrentHour()
{
	if (Timestamp.UtcNow().GetHour() > 12)
	{
		return Timestamp.UtcNow().GetHour() - 12;
	}
	else { return Timestamp.UtcNow().GetHour(); }
}

FString ADA_Vehicle_Basic::GetAMOrPM(int hour)
{
	if (hour > 12)
	{
		return "PM";
	}
	else { return "AM"; }
}

FString ADA_Vehicle_Basic::GetAdjustedTime()
{
	if (TotalTimeSkipped > 0.0f)
	{
		int hour = GetCurrentHour();
		int minute = Timestamp.UtcNow().GetMinute() + TotalTimeSkipped;
		int hoursSkipped = minute / 60;

		if (hoursSkipped > 0)
		{
			minute -= 60 * hoursSkipped;
			hour += hoursSkipped;
		}

		return FString::FromInt(hour) + ":" + FString::FromInt(minute) + ":" +
			FString::FromInt(Timestamp.UtcNow().GetSecond()) + " " + GetAMOrPM(hour);
	}

	// No time has been skipped
	else
	{
		return FString::FromInt(GetCurrentHour()) + ":" + FString::FromInt(Timestamp.UtcNow().GetMinute()) + ":" +
			FString::FromInt(Timestamp.UtcNow().GetSecond()) + " " + GetAMOrPM(GetCurrentHour());
	}
}

FString ADA_Vehicle_Basic::GetTimeWorkedInMinutes()
{
	int TotalTimeWorked = 0;
	int hour = GetCurrentHour();
	int minute = Timestamp.UtcNow().GetMinute();

	// Handle the difference in minutes
	if (minute >= StartMinute)
	{
		TotalTimeWorked += minute - StartMinute;
	}
	else
	{
		TotalTimeWorked += ((60 - StartMinute) + minute);
	}

	// Add 60 minutes for every additional hour
	if (hour > StartHour+1)
	{
		TotalTimeWorked += (hour - StartHour+1) * 60;
	}

	// Add skipped time
	TotalTimeWorked += TotalTimeSkipped;

	return FString::FromInt(TotalTimeWorked);
}

FString ADA_Vehicle_Basic::GetDirectionFromHeading(float Heading)
{
	if (Heading < 180)
	{
		if (Heading > 165) { return "S"; }
		else if (Heading <= 165 && Heading > 120) { return "SE"; }
		else if (Heading <= 120 && Heading > 75) { return "E"; }
		else if (Heading <= 75 && Heading > 30) { return "NE"; }
		else { return "N"; }
	}

	else
	{
		if (Heading <= 210) { return "S"; }
		else if (Heading <= 255) { return "SW"; }
		else if (Heading <= 300) { return "W"; }
		else if (Heading <= 345) { return "NW"; }
		else { return "N"; }
	}
}
