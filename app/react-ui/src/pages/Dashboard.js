import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Button,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

// Styled components
const RootStyle = styled('div')({
  height: '100%',
  padding: '24px'
});

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  color: theme.palette.common.white,
  backgroundImage: 'linear-gradient(to bottom right, #2065D1, #103996)',
  boxShadow: theme.shadows[3]
}));

const RegularCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: theme.shadows[2]
}));

// Mock data - would be replaced with real API calls
const mockDatabases = [
  { name: 'production_db', engine: 'PostgreSQL', size: '1.2 GB', tables: 32 },
  { name: 'testing_db', engine: 'MySQL', size: '450 MB', tables: 18 },
  { name: 'development_db', engine: 'PostgreSQL', size: '320 MB', tables: 24 }
];

const mockSystemInfo = {
  cpuUsage: 24,
  memoryUsage: 42,
  diskUsage: 68,
  uptime: '15 days, 7 hours'
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [databases, setDatabases] = useState([]);
  const [systemInfo, setSystemInfo] = useState({});

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setTimeout(() => {
        setDatabases(mockDatabases);
        setSystemInfo(mockSystemInfo);
        setLoading(false);
      }, 1000);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <RootStyle>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overview of your database systems and performance
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h3" sx={{ mb: 0.5 }}>
                    {databases.length}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ opacity: 0.72 }}>
                    Databases
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                  <StorageIcon />
                </Box>
              </Box>
              <Button 
                variant="contained" 
                size="small" 
                onClick={() => navigate('/databases/create')}
                startIcon={<AddIcon />}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,1)', 
                  color: '#1565c0',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  padding: '6px 16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.95)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                  }
                }}
              >
                New Database
              </Button>
            </CardContent>
          </StatsCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <RegularCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h4" sx={{ mb: 0.5 }}>
                    {databases.reduce((sum, db) => sum + db.tables, 0)}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Tables
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: 'primary.lighter', borderRadius: 1, color: 'primary.main' }}>
                  <TableChartIcon />
                </Box>
              </Box>
            </CardContent>
          </RegularCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <RegularCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h4" sx={{ mb: 0.5 }}>
                    {systemInfo.cpuUsage}%
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    CPU Usage
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: 'primary.lighter', borderRadius: 1, color: 'primary.main' }}>
                  <MemoryIcon />
                </Box>
              </Box>
            </CardContent>
          </RegularCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <RegularCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h4" sx={{ mb: 0.5 }}>
                    {systemInfo.memoryUsage}%
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Memory Usage
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: 'primary.lighter', borderRadius: 1, color: 'primary.main' }}>
                  <SpeedIcon />
                </Box>
              </Box>
            </CardContent>
          </RegularCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <RegularCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Recent Databases</Typography>
                <Button 
                  size="small" 
                  onClick={() => navigate('/databases')}
                  sx={{ textTransform: 'none' }}
                >
                  View All
                </Button>
              </Box>
              
              {databases.map((db, index) => (
                <React.Fragment key={db.name}>
                  <Box sx={{ py: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle1">{db.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{db.engine}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2">{db.size}</Typography>
                        <Typography variant="body2" color="text.secondary">{db.tables} tables</Typography>
                      </Box>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => navigate(`/databases/${db.name}`)}
                      >
                        Connect
                      </Button>
                    </Stack>
                  </Box>
                  {index < databases.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </CardContent>
          </RegularCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <RegularCard>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                System Information
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    CPU Usage
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <Box 
                        sx={{ 
                          height: 10, 
                          bgcolor: 'grey.200', 
                          borderRadius: 5,
                          position: 'relative'
                        }}
                      >
                        <Box 
                          sx={{
                            position: 'absolute',
                            height: '100%',
                            bgcolor: 'primary.main',
                            borderRadius: 5,
                            width: `${systemInfo.cpuUsage}%`
                          }}
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.primary">
                      {systemInfo.cpuUsage}%
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Memory Usage
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <Box 
                        sx={{ 
                          height: 10, 
                          bgcolor: 'grey.200', 
                          borderRadius: 5,
                          position: 'relative'
                        }}
                      >
                        <Box 
                          sx={{
                            position: 'absolute',
                            height: '100%',
                            bgcolor: 'primary.main',
                            borderRadius: 5,
                            width: `${systemInfo.memoryUsage}%`
                          }}
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.primary">
                      {systemInfo.memoryUsage}%
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Disk Usage
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <Box 
                        sx={{ 
                          height: 10, 
                          bgcolor: 'grey.200', 
                          borderRadius: 5,
                          position: 'relative'
                        }}
                      >
                        <Box 
                          sx={{
                            position: 'absolute',
                            height: '100%',
                            bgcolor: 'primary.main',
                            borderRadius: 5,
                            width: `${systemInfo.diskUsage}%`
                          }}
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.primary">
                      {systemInfo.diskUsage}%
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    System Uptime
                  </Typography>
                  <Typography variant="body1">
                    {systemInfo.uptime}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </RegularCard>
        </Grid>
      </Grid>
    </RootStyle>
  );
} 