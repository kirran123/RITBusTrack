-- ============================================================================
-- RAMCO INSTITUTE OF TECHNOLOGY (RIT) - BUS TRACKING DATABASE SEED
-- 30 Official Real Routes, Drivers, Buses, and Stops (100% Valid UUID Format)
-- ============================================================================

-- 1. Profiles for Super Admin & 30 Real Drivers
INSERT INTO public.profiles (id, auth_user_id, name, email, phone, role, status)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', NULL, 'Super Admin', 'kirranvijay@gmail.com', '+91 9876543210', 'admin', 'active'),
  ('d0000000-0000-0000-0000-000000000001', NULL, 'Mr. B. Moorthi', 'moorthi.driver@ritrjpm.ac.in', '9894668646', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000002', NULL, 'Mr. A. Gurumoorthy', 'gurumoorthy.driver@ritrjpm.ac.in', '9786470807', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000003', NULL, 'Mr. M. Muthuvelpandi', 'muthuvelpandi.driver@ritrjpm.ac.in', '9787764316', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000004', NULL, 'Mr. C. Rameshwaran', 'rameshwaran.driver@ritrjpm.ac.in', '9944414028', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000005', NULL, 'Mr. G. Murugan', 'murugan.driver@ritrjpm.ac.in', '9487297578', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000006', NULL, 'Mr. S. Mariyappan', 'mariyappan.driver@ritrjpm.ac.in', '8883477365', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000007', NULL, 'Mr. C. Sundarraj', 'sundarraj.driver@ritrjpm.ac.in', '9025242536', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000008', NULL, 'Mr. K. Raju', 'raju.driver@ritrjpm.ac.in', '9791561199', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000009', NULL, 'Mr. K. Sankar', 'sankar.driver@ritrjpm.ac.in', '9942359928', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000010', NULL, 'Mr. P. Muneeswaran', 'muneeswaran.driver@ritrjpm.ac.in', '9791025181', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000011', NULL, 'Mr. G. Vishnuvaradhan', 'vishnu.driver@ritrjpm.ac.in', '9080228810', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000012', NULL, 'Mr. V. Pulugandi', 'pulugandi.driver@ritrjpm.ac.in', '9655463237', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000013', NULL, 'Mr. G. Muthukumar', 'muthukumar.driver@ritrjpm.ac.in', '8870815821', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000014', NULL, 'Mr. M. Gurunathan', 'gurunathan.driver@ritrjpm.ac.in', '8143987207', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000015', NULL, 'Mr. M. Paramasivam', 'paramasivam.driver@ritrjpm.ac.in', '9787506114', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000016', NULL, 'Mr. P. Balamurugan', 'balamurugan.driver@ritrjpm.ac.in', '8056457883', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000017', NULL, 'Mr. S. Kannan', 'kannan.driver@ritrjpm.ac.in', '9655717809', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000018', NULL, 'Kumar K', 'kumar.driver@ritrjpm.ac.in', '9626768029', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000019', NULL, 'Mr. R. Pandiyaraj', 'pandiyaraj.driver@ritrjpm.ac.in', '9655578154', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000020', NULL, 'Mr. S. Jayaganesan', 'jayaganesan.driver@ritrjpm.ac.in', '9787772803', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000021', NULL, 'Mr. R. Yogeshkumar', 'yogeshkumar.driver@ritrjpm.ac.in', '9500318042', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000022', NULL, 'Mr. R. Selvakumar', 'selvakumar.driver@ritrjpm.ac.in', '9487257513', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000023', NULL, 'Mr. R. Sivakumar', 'sivakumar.driver@ritrjpm.ac.in', '9442534601', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000024', NULL, 'Mr. N. Ganesan', 'ganesan.driver@ritrjpm.ac.in', '9884824131', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000025', NULL, 'Mr. G. Senthil Kumar', 'gsenthil.driver@ritrjpm.ac.in', '6379437127', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000026', NULL, 'Mr. R. Kalimuthu', 'kalimuthu.driver@ritrjpm.ac.in', '9585271800', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000027', NULL, 'Mr. K. Senthil Kumar', 'ksenthil.driver@ritrjpm.ac.in', '9940842108', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000028', NULL, 'Mr. R. Kalamegam', 'kalamegam.driver@ritrjpm.ac.in', '7867027589', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000029', NULL, 'Mr. S. Velmurugan', 'velmurugan.driver@ritrjpm.ac.in', '9585875780', 'driver', 'active'),
  ('d0000000-0000-0000-0000-000000000030', NULL, 'Mr. A. Muthukrishnan', 'muthukrishnan.driver@ritrjpm.ac.in', '7092454418', 'driver', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone;

-- 2. 30 Official Real Routes (using valid hexadecimal prefix f0000000-...)
INSERT INTO public.routes (id, route_name, description, start_location, destination, distance_km, estimated_duration, status)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Route 1: Old Bus Stand, RJPM', 'Old Bus Stand to RIT Campus', 'Old Bus Stand, RJPM', 'Ramco Institute of Technology', 9.5, '25 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000002', 'Route 2: Kollakondan Villakku', 'Kollakondan Villakku to RIT Campus', 'Kollakondan Villakku', 'Ramco Institute of Technology', 14.0, '35 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000003', 'Route 3: Thenmalai', 'Thenmalai to RIT Campus', 'Thenmalai', 'Ramco Institute of Technology', 38.0, '60 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000004', 'Route 4: Malayadipatti - RJPM', 'Malayadipatti to RIT Campus', 'Malayadipatti - RJPM', 'Ramco Institute of Technology', 12.0, '30 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000005', 'Route 5: Thendral Nagar - RJPM', 'Thendral Nagar to RIT Campus', 'Thendral Nagar - RJPM', 'Ramco Institute of Technology', 8.0, '20 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000006', 'Route 6: Vasudevanallur', 'Vasudevanallur to RIT Campus', 'Vasudevanallur', 'Ramco Institute of Technology', 34.0, '55 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000007', 'Route 7: New Bus Stand - RJPM', 'New Bus Stand to RIT Campus', 'New Bus Stand - RJPM', 'Ramco Institute of Technology', 10.5, '25 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000008', 'Route 9: Krishnankoil', 'Krishnankoil to RIT Campus', 'Krishnankoil', 'Ramco Institute of Technology', 26.0, '45 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000009', 'Route 10: JawaherMaithanam, RJPM', 'JawaherMaithanam to RIT Campus', 'JawaherMaithanam, RJPM', 'Ramco Institute of Technology', 9.0, '25 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000010', 'Route 12: Attai Mill', 'Attai Mill to RIT Campus', 'Attai Mill', 'Ramco Institute of Technology', 15.0, '35 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000011', 'Route 13: Theradi Stop- SRIVI', 'Theradi Stop to RIT Campus', 'Theradi Stop- SRIVI', 'Ramco Institute of Technology', 16.5, '35 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000012', 'Route 14: Mamsapuram', 'Mamsapuram to RIT Campus', 'Mamsapuram', 'Ramco Institute of Technology', 13.0, '30 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000013', 'Route 15: R.R.Nagar, RJPM', 'R.R.Nagar to RIT Campus', 'R.R.Nagar, RJPM', 'Ramco Institute of Technology', 11.0, '25 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000014', 'Route 16: S.Ramalingapuram', 'S.Ramalingapuram to RIT Campus', 'S.Ramalingapuram', 'Ramco Institute of Technology', 18.0, '40 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000015', 'Route 17: Bus Stand - SRIVI', 'Srivilliputhur Bus Stand to RIT Campus', 'Bus Stand - SRIVI', 'Ramco Institute of Technology', 17.0, '35 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000016', 'Route 18: Ramakrishnapuram, SRIVI', 'Ramakrishnapuram to RIT Campus', 'Ramakrishnapuram, SRIVI', 'Ramco Institute of Technology', 19.0, '40 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000017', 'Route 19: Ganthi Statue - RJPM', 'Ganthi Statue to RIT Campus', 'Ganthi Statue - RJPM', 'Ramco Institute of Technology', 7.5, '20 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000018', 'Route 20: Kaliyamman Kovil - RJPM', 'Kaliyamman Kovil to RIT Campus', 'Kaliyamman Kovil - RJPM', 'Ramco Institute of Technology', 8.5, '20 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000019', 'Route 21: Sivakasi(Housing Board)', 'Sivakasi Housing Board to RIT Campus', 'Sivakasi(Housing Board)', 'Ramco Institute of Technology', 30.0, '50 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000020', 'Route 22: Thiruvengadam', 'Thiruvengadam to RIT Campus', 'Thiruvengadam', 'Ramco Institute of Technology', 36.0, '55 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000021', 'Route 23: Sithurajapuram - Sivakasi', 'Sithurajapuram to RIT Campus', 'Sithurajapuram - Sivakasi', 'Ramco Institute of Technology', 32.0, '55 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000022', 'Route 24: Virudhunagar', 'Virudhunagar to RIT Campus', 'Virudhunagar', 'Ramco Institute of Technology', 55.0, '75 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000023', 'Route 25: Railway Station, SNKL', 'Railway Station Sankarankoil to RIT Campus', 'Railway Station, SNKL', 'Ramco Institute of Technology', 35.0, '50 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000024', 'Route 26: Rayagiri', 'Rayagiri to RIT Campus', 'Rayagiri', 'Ramco Institute of Technology', 42.0, '65 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000025', 'Route 27: Kadayanallur', 'Kadayanallur to RIT Campus', 'Kadayanallur', 'Ramco Institute of Technology', 52.0, '75 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000026', 'Route 28: Mottamalai - RJPM', 'Mottamalai to RIT Campus', 'Mottamalai - RJPM', 'Ramco Institute of Technology', 16.0, '35 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000027', 'Route 29: Bus Stand , SNKL', 'Bus Stand Sankarankoil to RIT Campus', 'Bus Stand , SNKL', 'Ramco Institute of Technology', 34.0, '50 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000028', 'Route 30: Alangulam', 'Alangulam to RIT Campus', 'Alangulam', 'Ramco Institute of Technology', 28.0, '45 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000029', 'Route 31: Cornation-Sivakasi', 'Cornation Sivakasi to RIT Campus', 'Cornation-Sivakasi', 'Ramco Institute of Technology', 31.0, '55 mins', 'active'),
  ('f0000000-0000-0000-0000-000000000030', 'Route 32: Kansapuram', 'Kansapuram to RIT Campus', 'Kansapuram', 'Ramco Institute of Technology', 46.0, '65 mins', 'active')
ON CONFLICT (id) DO UPDATE SET route_name = EXCLUDED.route_name;

-- 3. 30 Official Real Drivers
INSERT INTO public.drivers (id, user_id, employee_id, license_number, phone, password, status)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'EMP-DRV-01', 'TN-67-2015-001', '9894668646', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'EMP-DRV-02', 'TN-67-2016-002', '9786470807', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'EMP-DRV-03', 'TN-67-2014-003', '9787764316', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'EMP-DRV-04', 'TN-67-2017-004', '9944414028', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'EMP-DRV-05', 'TN-67-2018-005', '9487297578', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 'EMP-DRV-06', 'TN-84-2015-006', '8883477365', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', 'EMP-DRV-07', 'TN-84-2016-007', '9025242536', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', 'EMP-DRV-08', 'TN-84-2017-008', '9791561199', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000009', 'EMP-DRV-09', 'TN-84-2018-009', '9942359928', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000010', 'EMP-DRV-10', 'TN-84-2019-010', '9791025181', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000011', 'EMP-DRV-11', 'TN-84-2019-011', '9080228810', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000012', 'EMP-DRV-12', 'TN-84-2018-012', '9655463237', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000013', 'EMP-DRV-13', 'TN-84-2017-013', '8870815821', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000014', 'EMP-DRV-14', 'TN-84-2016-014', '8143987207', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000015', 'EMP-DRV-15', 'TN-84-2015-015', '9787506114', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000016', 'd0000000-0000-0000-0000-000000000016', 'EMP-DRV-16', 'TN-84-2017-016', '8056457883', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000017', 'd0000000-0000-0000-0000-000000000017', 'EMP-DRV-17', 'TN-84-2016-017', '9655717809', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000018', 'd0000000-0000-0000-0000-000000000018', 'EMP-DRV-18', 'TN-84-2018-018', '9626768029', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000019', 'd0000000-0000-0000-0000-000000000019', 'EMP-DRV-19', 'TN-84-2019-019', '9655578154', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000020', 'd0000000-0000-0000-0000-000000000020', 'EMP-DRV-20', 'TN-84-2020-020', '9787772803', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000021', 'd0000000-0000-0000-0000-000000000021', 'EMP-DRV-21', 'TN-84-2021-021', '9500318042', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000022', 'EMP-DRV-22', 'TN-84-2015-022', '9487257513', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000023', 'd0000000-0000-0000-0000-000000000023', 'EMP-DRV-23', 'TN-84-2016-023', '9442534601', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000024', 'd0000000-0000-0000-0000-000000000024', 'EMP-DRV-24', 'TN-84-2017-024', '9884824131', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000025', 'd0000000-0000-0000-0000-000000000025', 'EMP-DRV-25', 'TN-84-2018-025', '6379437127', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000026', 'd0000000-0000-0000-0000-000000000026', 'EMP-DRV-26', 'TN-84-2019-026', '9585271800', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000027', 'd0000000-0000-0000-0000-000000000027', 'EMP-DRV-27', 'TN-84-2020-027', '9940842108', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000028', 'd0000000-0000-0000-0000-000000000028', 'EMP-DRV-28', 'TN-84-2021-028', '7867027589', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000029', 'd0000000-0000-0000-0000-000000000029', 'EMP-DRV-29', 'TN-84-2022-029', '9585875780', 'driver123', 'active'),
  ('20000000-0000-0000-0000-000000000030', 'd0000000-0000-0000-0000-000000000030', 'EMP-DRV-30', 'TN-84-2023-030', '7092454418', 'driver123', 'active')
ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;

-- 4. 30 Official Real Buses with Vehicle Registrations
INSERT INTO public.buses (id, bus_number, registration_number, bus_name, capacity, route_id, assigned_driver_id, status)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'BUS-01', 'TN 67 AM 9785', 'Old Bus Stand Shuttle', 55, 'f0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'active'),
  ('b0000000-0000-0000-0000-000000000002', 'BUS-02', 'TN 67 AM 9877', 'Kollakondan Express', 55, 'f0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'active'),
  ('b0000000-0000-0000-0000-000000000003', 'BUS-03', 'TN 67 AL 2292', 'Thenmalai Express', 55, 'f0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'active'),
  ('b0000000-0000-0000-0000-000000000004', 'BUS-04', 'TN 67 AL 2305', 'Malayadipatti Liner', 50, 'f0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'active'),
  ('b0000000-0000-0000-0000-000000000005', 'BUS-05', 'TN 67 AL 2944', 'Thendral Nagar Coach', 50, 'f0000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'active'),
  ('b0000000-0000-0000-0000-000000000006', 'BUS-06', 'TN 84 - 3620', 'Vasudevanallur Express', 60, 'f0000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'active'),
  ('b0000000-0000-0000-0000-000000000007', 'BUS-07', 'TN 84 - 3637', 'New Bus Stand Super', 55, 'f0000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'active'),
  ('b0000000-0000-0000-0000-000000000008', 'BUS-09', 'TN 84 - 3648', 'Krishnankoil Shuttle', 55, 'f0000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', 'active'),
  ('b0000000-0000-0000-0000-000000000009', 'BUS-10', 'TN 84 - 5808', 'JawaherMaithanam Liner', 50, 'f0000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', 'active'),
  ('b0000000-0000-0000-0000-000000000010', 'BUS-12', 'TN 84 A 9045', 'Attai Mill Express', 55, 'f0000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000010', 'active'),
  ('b0000000-0000-0000-0000-000000000011', 'BUS-13', 'TN 84 A 9040', 'Theradi Stop SRIVI', 55, 'f0000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000011', 'active'),
  ('b0000000-0000-0000-0000-000000000012', 'BUS-14', 'TN 84 A 9046', 'Mamsapuram Coach', 50, 'f0000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000012', 'active'),
  ('b0000000-0000-0000-0000-000000000013', 'BUS-15', 'TN 84 A 9034', 'R.R.Nagar Special', 50, 'f0000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000013', 'active'),
  ('b0000000-0000-0000-0000-000000000014', 'BUS-16', 'TN 84 A 9055', 'S.Ramalingapuram Liner', 55, 'f0000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000014', 'active'),
  ('b0000000-0000-0000-0000-000000000015', 'BUS-17', 'TN 84 C 3078', 'Srivilliputhur Deluxe', 55, 'f0000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000015', 'active'),
  ('b0000000-0000-0000-0000-000000000016', 'BUS-18', 'TN 84 C 3070', 'Ramakrishnapuram Shuttle', 50, 'f0000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000016', 'active'),
  ('b0000000-0000-0000-0000-000000000017', 'BUS-19', 'TN 84 C 3051', 'Ganthi Statue City', 50, 'f0000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000017', 'active'),
  ('b0000000-0000-0000-0000-000000000018', 'BUS-20', 'TN 84 C 3085', 'Kaliyamman Kovil Coach', 50, 'f0000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000018', 'active'),
  ('b0000000-0000-0000-0000-000000000019', 'BUS-21', 'TN 84 C 3053', 'Sivakasi Housing Board', 60, 'f0000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000019', 'active'),
  ('b0000000-0000-0000-0000-000000000020', 'BUS-22', 'TN 84 Q 2970', 'Thiruvengadam Express', 55, 'f0000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000020', 'active'),
  ('b0000000-0000-0000-0000-000000000021', 'BUS-23', 'TN 84 Q 2965', 'Sithurajapuram Shuttle', 55, 'f0000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000021', 'active'),
  ('b0000000-0000-0000-0000-000000000022', 'BUS-24', 'TN 84 Q 2986', 'Virudhunagar Highway Express', 60, 'f0000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000022', 'active'),
  ('b0000000-0000-0000-0000-000000000023', 'BUS-25', 'TN 84 U 6366', 'SNKL Railway Station Liner', 55, 'f0000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000023', 'active'),
  ('b0000000-0000-0000-0000-000000000024', 'BUS-26', 'TN 84 U 6352', 'Rayagiri Deluxe', 55, 'f0000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000024', 'active'),
  ('b0000000-0000-0000-0000-000000000025', 'BUS-27', 'TN 84 U 6558', 'Kadayanallur Express', 60, 'f0000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000025', 'active'),
  ('b0000000-0000-0000-0000-000000000026', 'BUS-28', 'TN 84 AZ 3600', 'Mottamalai Coach', 50, 'f0000000-0000-0000-0000-000000000026', '20000000-0000-0000-0000-000000000026', 'active'),
  ('b0000000-0000-0000-0000-000000000027', 'BUS-29', 'TN 84 AZ 3559', 'Sankarankoil Bus Stand', 55, 'f0000000-0000-0000-0000-000000000027', '20000000-0000-0000-0000-000000000027', 'active'),
  ('b0000000-0000-0000-0000-000000000028', 'BUS-30', 'TN 84 AZ 3504', 'Alangulam Express', 55, 'f0000000-0000-0000-0000-000000000028', '20000000-0000-0000-0000-000000000028', 'active'),
  ('b0000000-0000-0000-0000-000000000029', 'BUS-31', 'TN 84 AZ 3972', 'Cornation Sivakasi Super', 55, 'f0000000-0000-0000-0000-000000000029', '20000000-0000-0000-0000-000000000029', 'active'),
  ('b0000000-0000-0000-0000-000000000030', 'BUS-32', 'TN 84 AZ 3976', 'Kansapuram Express', 55, 'f0000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000030', 'active')
ON CONFLICT (id) DO UPDATE SET registration_number = EXCLUDED.registration_number, bus_number = EXCLUDED.bus_number;

-- 5. Link Drivers to their Assigned Buses
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000001' WHERE id = '20000000-0000-0000-0000-000000000001';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000002' WHERE id = '20000000-0000-0000-0000-000000000002';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000003' WHERE id = '20000000-0000-0000-0000-000000000003';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000004' WHERE id = '20000000-0000-0000-0000-000000000004';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000005' WHERE id = '20000000-0000-0000-0000-000000000005';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000006' WHERE id = '20000000-0000-0000-0000-000000000006';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000007' WHERE id = '20000000-0000-0000-0000-000000000007';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000008' WHERE id = '20000000-0000-0000-0000-000000000008';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000009' WHERE id = '20000000-0000-0000-0000-000000000009';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000010' WHERE id = '20000000-0000-0000-0000-000000000010';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000011' WHERE id = '20000000-0000-0000-0000-000000000011';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000012' WHERE id = '20000000-0000-0000-0000-000000000012';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000013' WHERE id = '20000000-0000-0000-0000-000000000013';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000014' WHERE id = '20000000-0000-0000-0000-000000000014';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000015' WHERE id = '20000000-0000-0000-0000-000000000015';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000016' WHERE id = '20000000-0000-0000-0000-000000000016';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000017' WHERE id = '20000000-0000-0000-0000-000000000017';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000018' WHERE id = '20000000-0000-0000-0000-000000000018';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000019' WHERE id = '20000000-0000-0000-0000-000000000019';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000020' WHERE id = '20000000-0000-0000-0000-000000000020';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000021' WHERE id = '20000000-0000-0000-0000-000000000021';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000022' WHERE id = '20000000-0000-0000-0000-000000000022';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000023' WHERE id = '20000000-0000-0000-0000-000000000023';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000024' WHERE id = '20000000-0000-0000-0000-000000000024';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000025' WHERE id = '20000000-0000-0000-0000-000000000025';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000026' WHERE id = '20000000-0000-0000-0000-000000000026';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000027' WHERE id = '20000000-0000-0000-0000-000000000027';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000028' WHERE id = '20000000-0000-0000-0000-000000000028';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000029' WHERE id = '20000000-0000-0000-0000-000000000029';
UPDATE public.drivers SET assigned_bus_id = 'b0000000-0000-0000-0000-000000000030' WHERE id = '20000000-0000-0000-0000-000000000030';
