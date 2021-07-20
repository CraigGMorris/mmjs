
/// *********************************************************************************
/// *********************************************************************************
///                     EMSCRIPTEN (for javascript)
/// *********************************************************************************
/// *********************************************************************************

#ifdef EMSCRIPTEN

#include "CoolProp.h"
#include "AbstractState.h"
#include "Configuration.h"
#include "HumidAirProp.h"
#include "DataStructures.h"
#include "Backends/Helmholtz/MixtureParameters.h"
#include "CoolPropLib.h"

/// *********************************************************************************
/// *********************************************************************************
///                     EMSCRIPTEN (for javascript)
/// *********************************************************************************
/// *********************************************************************************

#include <emscripten/bind.h>
using namespace emscripten;

// Binding code
EMSCRIPTEN_BINDINGS(coolprop_bindings) {
    function("F2K", &F2K);
    function("Props1SI", &CoolProp::Props1SI);
    function("PropsSI", &CoolProp::PropsSI);
    function("get_global_param_string", &CoolProp::get_global_param_string);
    function("set_debug_level", &set_debug_level);

    enum_<CoolProp::input_pairs>("input_pairs")
        .value("PT_INPUTS", CoolProp::PT_INPUTS)
        .value("QT_INPUTS", CoolProp::QT_INPUTS)
        .value("PQ_INPUTS", CoolProp::PQ_INPUTS)
        .value("HmolarT_INPUTS", CoolProp::HmolarT_INPUTS)
        .value("HmolarP_INPUTS", CoolProp::HmolarP_INPUTS)
        .value("SmolarT_INPUTS", CoolProp::SmolarT_INPUTS)
        .value("PSmolar_INPUTS", CoolProp::PSmolar_INPUTS)      
        .value("DmolarT_INPUTS", CoolProp::DmolarT_INPUTS)
        .value("DmolarP_INPUTS", CoolProp::DmolarP_INPUTS)      
        .value("DmolarQ_INPUTS", CoolProp::DmolarQ_INPUTS)      
        .value("DmolarHmolar_INPUTS", CoolProp::DmolarHmolar_INPUTS)      
        .value("DmolarSmolar_INPUTS", CoolProp::DmolarSmolar_INPUTS)      
    ;
    
    enum_<CoolProp::parameters>("parameters")
        .value("iT", CoolProp::iT)
        .value("iP", CoolProp::iP)
        .value("iQ", CoolProp::iQ)
        .value("imolar_mass", CoolProp::imolar_mass)
        .value("iPhase", CoolProp::iPhase)
        // Molar specific thermodynamic properties
        .value("iDmolar", CoolProp::iDmolar) ///< Mole-based density
        .value("iHmolar", CoolProp::iHmolar) ///< Mole-based enthalpy
        .value("iSmolar", CoolProp::iSmolar) ///< Mole-based entropy
        .value("iCpmolar", CoolProp::iCpmolar) ///< Mole-based constant-pressure specific heat
        .value("iCp0molar", CoolProp::iCp0molar) ///< Mole-based ideal-gas constant-pressure specific heat
        .value("iCvmolar", CoolProp::iCvmolar) ///< Mole-based constant-volume specific heat
        .value("iUmolar", CoolProp::iUmolar) ///< Mole-based internal energy
        .value("iGmolar", CoolProp::iGmolar) ///< Mole-based Gibbs energy
        .value("iHelmholtzmolar", CoolProp::iHelmholtzmolar) ///< Mole-based Helmholtz energy
        // Mass specific thermodynamic properties
        .value("iDmass", CoolProp::iDmass) ///< Mass-based density
        .value("iHmass", CoolProp::iHmass) ///< Mass-based enthalpy
        .value("iSmass", CoolProp::iSmass) ///< Mass-based entropy
        .value("iCpmass", CoolProp::iCpmass) ///< Mass-based constant-pressure specific heat
        .value("iCp0mass", CoolProp::iCp0mass) ///< Mass-based ideal-gas specific heat
        .value("iCvmass", CoolProp::iCvmass) ///< Mass-based constant-volume specific heat
        .value("iUmass", CoolProp::iUmass) ///< Mass-based internal energy
        .value("iGmass", CoolProp::iGmass) ///< Mass-based Gibbs energy
        .value("iHelmholtzmass", CoolProp::iHelmholtzmass) ///< Mass-based Helmholtz energy
        .value("iT_min", CoolProp::iT_min) ///< Minimum temperature
        .value("iT_max", CoolProp::iT_max) ///< Maximum temperature
        .value("iP_min", CoolProp::iP_min) ///< Minimum pressure
        .value("iP_max", CoolProp::iP_max) ///< Maximum pressure


        // Transport properties
        .value("iviscosity", CoolProp::iviscosity) ///< Viscosity
        .value("iconductivity", CoolProp::iconductivity) ///< Thermal conductivity
        .value("isurface_tension", CoolProp::isurface_tension) ///< Surface tension
        .value("iPrandtl", CoolProp::iPrandtl) ///< The Prandtl number

    ;

    enum_<CoolProp::phases>("phases")
        .value("iphase_supercritical", CoolProp::iphase_supercritical)
        .value("iphase_supercritical_gas", CoolProp::iphase_supercritical_gas)
        .value("iphase_supercritical_liquid", CoolProp::iphase_supercritical_liquid)
        .value("iphase_critical_point", CoolProp::iphase_critical_point)
        .value("iphase_gas", CoolProp::iphase_gas)
        .value("iphase_twophase", CoolProp::iphase_twophase)
        .value("iphase_unknown", CoolProp::iphase_unknown)
        .value("iphase_not_imposed", CoolProp::iphase_not_imposed)
    ;
}
// Binding code
EMSCRIPTEN_BINDINGS(humid_air_bindings) {
    function("HAPropsSI", &HumidAir::HAPropsSI);
}

CoolProp::AbstractState * factory(const std::string &backend, const std::string &fluid_names)
{
    return CoolProp::AbstractState::factory(backend, strsplit(fluid_names, '&'));
}

// Binding code
EMSCRIPTEN_BINDINGS(abstract_state_bindings) {

    register_vector<double>("VectorDouble");
    register_vector<std::string>("VectorString");

    value_object<CoolProp::PhaseEnvelopeData>("CoolProp::PhaseEnvelopeData")
        // Use X macros to auto-generate the variables; 
        // each will look something like: .field("T", &CoolProp::PhaseEnvelopeData::T);
        #define X(name) .field(#name, &CoolProp::PhaseEnvelopeData::name)
            PHASE_ENVELOPE_VECTORS
        #undef X
        ;

    function("factory", &factory, allow_raw_pointers());

    class_<CoolProp::AbstractState>("AbstractState")
        .function("gas_constant", &CoolProp::AbstractState::gas_constant)
        .function("update", &CoolProp::AbstractState::update)
        .function("p", &CoolProp::AbstractState::p)
        .function("rhomass", &CoolProp::AbstractState::rhomass)
        .function("viscosity", &CoolProp::AbstractState::viscosity)
        .function("set_mole_fractions", &CoolProp::AbstractState::set_mole_fractions_double)
        .function("set_mass_fractions", &CoolProp::AbstractState::set_mass_fractions_double)
        .function("build_phase_envelope", &CoolProp::AbstractState::build_phase_envelope)
        .function("get_phase_envelope_data", &CoolProp::AbstractState::get_phase_envelope_data)
        .function("keyed_output", &CoolProp::AbstractState::keyed_output)
        .function("mole_fractions_liquid", &CoolProp::AbstractState::mole_fractions_liquid_double)
        .function("mole_fractions_vapor", &CoolProp::AbstractState::mole_fractions_vapor_double)
        .function("molar_mass", &CoolProp::AbstractState::molar_mass)
        .function("saturated_liquid_keyed_output", &CoolProp::AbstractState::saturated_liquid_keyed_output)
        .function("saturated_vapor_keyed_output", &CoolProp::AbstractState::saturated_vapor_keyed_output)
        .function("get_fluid_constant", &CoolProp::AbstractState::get_fluid_constant)
        .function("fugacity", &CoolProp::AbstractState::fugacity)
        .function("specify_phase", &CoolProp::AbstractState::specify_phase)
        .function("t_critical", &CoolProp::AbstractState::T_critical)
        .function("p_critical", &CoolProp::AbstractState::p_critical)
    ;

}

#endif